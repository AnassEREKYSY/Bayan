-- ═══════════════════════════════════════════════════════════════════════════
-- Bayan — initial schema
--
-- Principles
--   • Every table has Row Level Security enabled. Nothing is readable or
--     writable unless a policy below allows it.
--   • User-owned rows carry user_id and are only visible to their owner.
--   • Shared market data (assets, quotes, prices, FX, news, events) is
--     read-only for signed-in users and written by server jobs using the
--     service role (which bypasses RLS) or by admins.
--   • Column-level grants stop users from changing fields they should not
--     (role, user_id, timestamps).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─── Enums ─────────────────────────────────────────────────────────────────
create type public.app_role        as enum ('user', 'admin');
create type public.asset_class     as enum ('stock', 'etf', 'index', 'crypto', 'commodity');
create type public.market          as enum ('casablanca', 'us', 'europe', 'crypto', 'commodities');
create type public.transaction_type as enum ('buy', 'sell', 'dividend', 'fee');
create type public.event_type      as enum ('dividend', 'agm', 'earnings', 'split', 'other');
create type public.alert_type      as enum ('price_above', 'price_below', 'daily_move');
create type public.summary_status  as enum ('pending', 'done', 'rejected', 'skipped');

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Profiles ──────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (char_length(display_name) <= 80),
  base_currency char(3) not null default 'MAD'
                check (base_currency in ('MAD', 'EUR', 'USD')),
  locale        text not null default 'fr' check (locale in ('en', 'fr')),
  role          public.app_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin() is SECURITY DEFINER so policies can call it without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Create a profile and a default portfolio for every new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'fr' end
  );

  insert into public.portfolios (user_id, name, is_default)
  values (new.id, 'Main', true);

  return new;
end;
$$;

-- ─── Market reference data ─────────────────────────────────────────────────
create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null check (char_length(symbol) between 1 and 20),
  name          text not null check (char_length(name) between 1 and 120),
  asset_class   public.asset_class not null,
  market        public.market not null,
  currency      char(3) not null,
  exchange      text,
  isin          text check (isin is null or isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  provider_ref  text,                 -- id used by the market data provider
  keywords      text[] not null default '{}', -- used to match news to assets
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (market, symbol)
);

create index assets_market_idx on public.assets (market) where is_active;
create index assets_search_idx on public.assets using gin (to_tsvector('simple', symbol || ' ' || name));

create table public.asset_quotes (
  asset_id        uuid primary key references public.assets (id) on delete cascade,
  price           numeric(28, 10) not null check (price >= 0),
  previous_close  numeric(28, 10) check (previous_close >= 0),
  as_of           timestamptz not null,
  source          text not null,
  updated_at      timestamptz not null default now()
);

create table public.asset_prices (
  asset_id    uuid not null references public.assets (id) on delete cascade,
  price_date  date not null,
  close       numeric(28, 10) not null check (close >= 0),
  primary key (asset_id, price_date)
);

-- Exchange rates against USD: 1 USD = rate × quote currency.
create table public.fx_rates (
  quote       char(3) primary key,
  rate        numeric(20, 10) not null check (rate > 0),
  as_of       timestamptz not null
);

-- ─── Portfolios ────────────────────────────────────────────────────────────
create table public.portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, name)
);

create unique index portfolios_one_default_per_user
  on public.portfolios (user_id) where is_default;

create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_id      uuid not null references public.assets (id) on delete restrict,
  type          public.transaction_type not null,
  quantity      numeric(28, 10) not null default 0 check (quantity >= 0),
  price         numeric(28, 10) not null default 0 check (price >= 0),
  fees          numeric(20, 4)  not null default 0 check (fees >= 0),
  amount        numeric(20, 4)  not null default 0 check (amount >= 0),
  currency      char(3) not null,
  executed_at   timestamptz not null,
  note          text check (char_length(note) <= 500),
  created_at    timestamptz not null default now(),
  -- Shape rules per transaction type
  constraint transactions_trade_shape check (
    type not in ('buy', 'sell') or (quantity > 0 and amount = 0)
  ),
  constraint transactions_cash_shape check (
    type not in ('dividend', 'fee') or (amount > 0 and quantity = 0 and price = 0)
  ),
  constraint transactions_not_in_future check (executed_at <= now() + interval '1 day')
);

create index transactions_user_date_idx on public.transactions (user_id, executed_at desc);
create index transactions_portfolio_idx on public.transactions (portfolio_id, executed_at);
create index transactions_asset_idx on public.transactions (asset_id);

create table public.watchlist_items (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_id    uuid not null references public.assets (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, asset_id)
);

-- ─── News & events ─────────────────────────────────────────────────────────
create table public.news_items (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) <= 400),
  url              text not null unique check (url ~ '^https://'),
  source           text not null,
  language         text not null default 'fr' check (language in ('en', 'fr', 'ar')),
  published_at     timestamptz not null,
  content_excerpt  text check (char_length(content_excerpt) <= 8000),
  summary_en       text check (char_length(summary_en) <= 800),
  summary_fr       text check (char_length(summary_fr) <= 800),
  summary_status   public.summary_status not null default 'pending',
  summarized_at    timestamptz,
  created_at       timestamptz not null default now()
);

create index news_published_idx on public.news_items (published_at desc);
create index news_summary_pending_idx on public.news_items (created_at) where summary_status = 'pending';

create table public.news_item_assets (
  news_id   uuid not null references public.news_items (id) on delete cascade,
  asset_id  uuid not null references public.assets (id) on delete cascade,
  primary key (news_id, asset_id)
);

create index news_item_assets_asset_idx on public.news_item_assets (asset_id);

create table public.corporate_events (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.assets (id) on delete cascade,
  type          public.event_type not null,
  title         text not null check (char_length(title) between 1 and 200),
  event_date    date not null,
  ex_date       date,
  payment_date  date,
  amount        numeric(20, 6) check (amount >= 0),
  currency      char(3),
  source_url    text check (source_url is null or source_url ~ '^https://'),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

create index corporate_events_date_idx on public.corporate_events (event_date);
create index corporate_events_asset_idx on public.corporate_events (asset_id, event_date);

-- ─── Alerts & notifications ────────────────────────────────────────────────
create table public.alert_rules (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_id           uuid not null references public.assets (id) on delete cascade,
  type               public.alert_type not null,
  threshold          numeric(28, 10) not null check (threshold > 0),
  is_active          boolean not null default true,
  last_triggered_at  timestamptz,
  created_at         timestamptz not null default now()
);

create index alert_rules_active_idx on public.alert_rules (asset_id) where is_active;
create index alert_rules_user_idx on public.alert_rules (user_id);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('alert', 'event', 'news', 'system')),
  title       text not null check (char_length(title) <= 200),
  body        text check (char_length(body) <= 1000),
  asset_id    uuid references public.assets (id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ─── Job log (server only) ─────────────────────────────────────────────────
create table public.job_runs (
  id           bigint generated always as identity primary key,
  job          text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  detail       jsonb
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.assets            enable row level security;
alter table public.asset_quotes      enable row level security;
alter table public.asset_prices      enable row level security;
alter table public.fx_rates          enable row level security;
alter table public.portfolios        enable row level security;
alter table public.transactions      enable row level security;
alter table public.watchlist_items   enable row level security;
alter table public.news_items        enable row level security;
alter table public.news_item_assets  enable row level security;
alter table public.corporate_events  enable row level security;
alter table public.alert_rules       enable row level security;
alter table public.notifications     enable row level security;
alter table public.job_runs          enable row level security; -- no policies: server only

-- Profiles: read and edit your own row only (columns restricted below).
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Shared market data: readable by signed-in users.
create policy "assets: read" on public.assets
  for select to authenticated using (true);
create policy "assets: admin insert" on public.assets
  for insert to authenticated with check ((select public.is_admin()));
create policy "assets: admin update" on public.assets
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "asset_quotes: read" on public.asset_quotes
  for select to authenticated using (true);
create policy "asset_prices: read" on public.asset_prices
  for select to authenticated using (true);
create policy "fx_rates: read" on public.fx_rates
  for select to authenticated using (true);
create policy "news_items: read" on public.news_items
  for select to authenticated using (true);
create policy "news_item_assets: read" on public.news_item_assets
  for select to authenticated using (true);

create policy "corporate_events: read" on public.corporate_events
  for select to authenticated using (true);
create policy "corporate_events: admin insert" on public.corporate_events
  for insert to authenticated with check ((select public.is_admin()));
create policy "corporate_events: admin delete" on public.corporate_events
  for delete to authenticated using ((select public.is_admin()));

-- Portfolios: owner only.
create policy "portfolios: read own" on public.portfolios
  for select to authenticated using (user_id = (select auth.uid()));
create policy "portfolios: insert own" on public.portfolios
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "portfolios: update own" on public.portfolios
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "portfolios: delete own" on public.portfolios
  for delete to authenticated using (user_id = (select auth.uid()) and not is_default);

-- Transactions: owner only, and the portfolio must belong to the same user.
create policy "transactions: read own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions: insert own" on public.transactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );
create policy "transactions: update own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );
create policy "transactions: delete own" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Watchlist: owner only.
create policy "watchlist: read own" on public.watchlist_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "watchlist: insert own" on public.watchlist_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "watchlist: delete own" on public.watchlist_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Alert rules: owner only.
create policy "alerts: read own" on public.alert_rules
  for select to authenticated using (user_id = (select auth.uid()));
create policy "alerts: insert own" on public.alert_rules
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alerts: update own" on public.alert_rules
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alerts: delete own" on public.alert_rules
  for delete to authenticated using (user_id = (select auth.uid()));

-- Notifications: owner reads, marks as read, deletes. Created by server jobs only.
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: update own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- Column-level privileges (defence in depth on top of RLS)
-- ═══════════════════════════════════════════════════════════════════════════
revoke all on all tables in schema public from anon;

revoke update on public.profiles from authenticated;
grant  update (display_name, base_currency, locale) on public.profiles to authenticated;

revoke update on public.portfolios from authenticated;
grant  update (name, is_default) on public.portfolios to authenticated;

revoke update on public.transactions from authenticated;
grant  update (portfolio_id, asset_id, type, quantity, price, fees, amount, currency, executed_at, note)
  on public.transactions to authenticated;

revoke update on public.alert_rules from authenticated;
grant  update (type, threshold, is_active) on public.alert_rules to authenticated;

revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

revoke all on public.job_runs from authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: make one portfolio the default atomically
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.set_default_portfolio(target uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.portfolios where id = target and user_id = (select auth.uid())
  ) then
    raise exception 'portfolio not found' using errcode = 'P0002';
  end if;

  update public.portfolios set is_default = false
    where user_id = (select auth.uid()) and is_default and id <> target;
  update public.portfolios set is_default = true where id = target;
end;
$$;

revoke all on function public.set_default_portfolio(uuid) from public;
grant execute on function public.set_default_portfolio(uuid) to authenticated;
