-- ═══════════════════════════════════════════════════════════════════════════
-- Open market: assets can be added on demand from the providers' catalogues,
-- and the full Casablanca list is available from the start.
-- ═══════════════════════════════════════════════════════════════════════════

-- When Bayan last tried to refresh an asset on demand (success or not).
-- Stops repeated page views from spending the free API quota.
alter table public.assets add column refresh_attempted_at timestamptz;

-- Who added which asset from a provider catalogue (rate limiting + audit).
create table public.asset_imports (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  asset_id    uuid not null references public.assets (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index asset_imports_user_idx on public.asset_imports (user_id, created_at desc);

alter table public.asset_imports enable row level security;

-- Users can see their own imports; rows are written by the server only.
create policy "asset_imports: read own" on public.asset_imports
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.asset_imports from anon;
revoke insert, update, delete on public.asset_imports from authenticated;

-- Used by the daily refresh to find assets someone holds, follows or watches.
create index if not exists watchlist_items_asset_idx on public.watchlist_items (asset_id);

-- Companies listed on the Bourse de Casablanca (list checked October 2026,
-- Le Matin market pages). Prices appear once CASABLANCA_FEED_URL is set.
insert into public.assets (symbol, name, asset_class, market, currency, exchange, provider_ref, keywords) values
  ('SBM', 'Société des Boissons du Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'SBM', array['société des boissons du maroc']),
  ('LES', 'Lesieur Cristal', 'stock', 'casablanca', 'MAD', 'BVC', 'LES', array['lesieur cristal']),
  ('CDM', 'Crédit du Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'CDM', array['crédit du maroc']),
  ('OUL', 'Les Eaux Minérales d''Oulmès', 'stock', 'casablanca', 'MAD', 'BVC', 'OUL', array['les eaux minérales d''oulmès']),
  ('SMI', 'Société Métallurgique d''Imiter', 'stock', 'casablanca', 'MAD', 'BVC', 'SMI', array['société métallurgique d''imiter']),
  ('BCP', 'Banque Centrale Populaire', 'stock', 'casablanca', 'MAD', 'BVC', 'BCP', array['banque centrale populaire']),
  ('BAL', 'Balima', 'stock', 'casablanca', 'MAD', 'BVC', 'BAL', array['balima']),
  ('CSR', 'Cosumar', 'stock', 'casablanca', 'MAD', 'BVC', 'CSR', array['cosumar']),
  ('EQD', 'Eqdom', 'stock', 'casablanca', 'MAD', 'BVC', 'EQD', array['eqdom']),
  ('NEJ', 'Auto Nejma', 'stock', 'casablanca', 'MAD', 'BVC', 'NEJ', array['auto nejma']),
  ('BCE', 'Bank of Africa', 'stock', 'casablanca', 'MAD', 'BVC', 'BCE', array['bank of africa']),
  ('GTM', 'SGTM', 'stock', 'casablanca', 'MAD', 'BVC', 'GTM', array['sgtm']),
  ('SID', 'Sonasid', 'stock', 'casablanca', 'MAD', 'BVC', 'SID', array['sonasid']),
  ('PRO', 'Promopharm', 'stock', 'casablanca', 'MAD', 'BVC', 'PRO', array['promopharm']),
  ('STR', 'Stroc Industrie', 'stock', 'casablanca', 'MAD', 'BVC', 'STR', array['stroc industrie']),
  ('ARD', 'Aradei Capital', 'stock', 'casablanca', 'MAD', 'BVC', 'ARD', array['aradei capital']),
  ('CMT', 'Compagnie Minière de Touissit', 'stock', 'casablanca', 'MAD', 'BVC', 'CMT', array['compagnie minière de touissit']),
  ('NKL', 'Ennakl Automobiles', 'stock', 'casablanca', 'MAD', 'BVC', 'NKL', array['ennakl automobiles']),
  ('FBR', 'Fenie Brossette', 'stock', 'casablanca', 'MAD', 'BVC', 'FBR', array['fenie brossette']),
  ('JET', 'Jet Contractors', 'stock', 'casablanca', 'MAD', 'BVC', 'JET', array['jet contractors']),
  ('MUT', 'Mutandis', 'stock', 'casablanca', 'MAD', 'BVC', 'MUT', array['mutandis']),
  ('COL', 'Colorado', 'stock', 'casablanca', 'MAD', 'BVC', 'COL', array['colorado']),
  ('ALM', 'Aluminium du Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'ALM', array['aluminium du maroc']),
  ('CIH', 'CIH Bank', 'stock', 'casablanca', 'MAD', 'BVC', 'CIH', array['cih bank']),
  ('T2S', 'T2S Group', 'stock', 'casablanca', 'MAD', 'BVC', 'T2S', array['t2s group']),
  ('CMG', 'CMGP Group', 'stock', 'casablanca', 'MAD', 'BVC', 'CMG', array['cmgp group']),
  ('SAM', 'Samir', 'stock', 'casablanca', 'MAD', 'BVC', 'SAM', array['samir']),
  ('S2M', 'S2M', 'stock', 'casablanca', 'MAD', 'BVC', 'S2M', array['s2m']),
  ('MDP', 'Med Paper', 'stock', 'casablanca', 'MAD', 'BVC', 'MDP', array['med paper']),
  ('SLF', 'Salafin', 'stock', 'casablanca', 'MAD', 'BVC', 'SLF', array['salafin']),
  ('M2M', 'M2M Group', 'stock', 'casablanca', 'MAD', 'BVC', 'M2M', array['m2m group']),
  ('SNP', 'SNEP', 'stock', 'casablanca', 'MAD', 'BVC', 'SNP', array['snep']),
  ('LBV', 'Label''Vie', 'stock', 'casablanca', 'MAD', 'BVC', 'LBV', array['label''vie']),
  ('MAB', 'Maghrebail', 'stock', 'casablanca', 'MAD', 'BVC', 'MAB', array['maghrebail']),
  ('CFG', 'CFG Bank', 'stock', 'casablanca', 'MAD', 'BVC', 'CFG', array['cfg bank']),
  ('CMA', 'Ciments du Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'CMA', array['ciments du maroc']),
  ('SAH', 'Sanlam Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'SAH', array['sanlam maroc']),
  ('ATL', 'AtlantaSanad', 'stock', 'casablanca', 'MAD', 'BVC', 'ATL', array['atlantasanad']),
  ('GAZ', 'Afriquia Gaz', 'stock', 'casablanca', 'MAD', 'BVC', 'GAZ', array['afriquia gaz']),
  ('ZDJ', 'Zellidja', 'stock', 'casablanca', 'MAD', 'BVC', 'ZDJ', array['zellidja']),
  ('BCI', 'BMCI', 'stock', 'casablanca', 'MAD', 'BVC', 'BCI', array['bmci']),
  ('DWY', 'Disway', 'stock', 'casablanca', 'MAD', 'BVC', 'DWY', array['disway']),
  ('VCN', 'Vicenne', 'stock', 'casablanca', 'MAD', 'BVC', 'VCN', array['vicenne']),
  ('WAA', 'Wafa Assurance', 'stock', 'casablanca', 'MAD', 'BVC', 'WAA', array['wafa assurance']),
  ('IMO', 'Immorente Invest', 'stock', 'casablanca', 'MAD', 'BVC', 'IMO', array['immorente invest']),
  ('CRS', 'Cartier Saada', 'stock', 'casablanca', 'MAD', 'BVC', 'CRS', array['cartier saada']),
  ('INV', 'Involys', 'stock', 'casablanca', 'MAD', 'BVC', 'INV', array['involys']),
  ('CTM', 'CTM', 'stock', 'casablanca', 'MAD', 'BVC', 'CTM', array['ctm']),
  ('REB', 'Rebab Company', 'stock', 'casablanca', 'MAD', 'BVC', 'REB', array['rebab company']),
  ('MLE', 'Maroc Leasing', 'stock', 'casablanca', 'MAD', 'BVC', 'MLE', array['maroc leasing']),
  ('DIS', 'Diac Salaf', 'stock', 'casablanca', 'MAD', 'BVC', 'DIS', array['diac salaf']),
  ('AFM', 'AFMA', 'stock', 'casablanca', 'MAD', 'BVC', 'AFM', array['afma']),
  ('RDS', 'Résidences Dar Saada', 'stock', 'casablanca', 'MAD', 'BVC', 'RDS', array['résidences dar saada']),
  ('UMR', 'Unimer', 'stock', 'casablanca', 'MAD', 'BVC', 'UMR', array['unimer']),
  ('TMA', 'TotalEnergies Marketing Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'TMA', array['totalenergies marketing maroc']),
  ('MOX', 'Maghreb Oxygène', 'stock', 'casablanca', 'MAD', 'BVC', 'MOX', array['maghreb oxygène']),
  ('IBC', 'IB Maroc.com', 'stock', 'casablanca', 'MAD', 'BVC', 'IBC', array['ib maroc.com']),
  ('AFI', 'Afric Industries', 'stock', 'casablanca', 'MAD', 'BVC', 'AFI', array['afric industries']),
  ('SRM', 'Réalisations Mécaniques', 'stock', 'casablanca', 'MAD', 'BVC', 'SRM', array['réalisations mécaniques']),
  ('MIC', 'Microdata', 'stock', 'casablanca', 'MAD', 'BVC', 'MIC', array['microdata']),
  ('AGM', 'Agma', 'stock', 'casablanca', 'MAD', 'BVC', 'AGM', array['agma']),
  ('DHO', 'Delta Holding', 'stock', 'casablanca', 'MAD', 'BVC', 'DHO', array['delta holding']),
  ('DYT', 'Disty Technologies', 'stock', 'casablanca', 'MAD', 'BVC', 'DYT', array['disty technologies']),
  ('SOT', 'Sothema', 'stock', 'casablanca', 'MAD', 'BVC', 'SOT', array['sothema']),
  ('ATH', 'Auto Hall', 'stock', 'casablanca', 'MAD', 'BVC', 'ATH', array['auto hall']),
  ('RIS', 'Risma', 'stock', 'casablanca', 'MAD', 'BVC', 'RIS', array['risma']),
  ('ADH', 'Addoha', 'stock', 'casablanca', 'MAD', 'BVC', 'ADH', array['addoha']),
  ('DLM', 'Delattre Levivier Maroc', 'stock', 'casablanca', 'MAD', 'BVC', 'DLM', array['delattre levivier maroc']),
  ('SNA', 'Stokvis Nord Afrique', 'stock', 'casablanca', 'MAD', 'BVC', 'SNA', array['stokvis nord afrique']),
  ('ADI', 'Alliances Développement Immobilier', 'stock', 'casablanca', 'MAD', 'BVC', 'ADI', array['alliances développement immobilier']),
  ('DRI', 'Dari Couspate', 'stock', 'casablanca', 'MAD', 'BVC', 'DRI', array['dari couspate'])
on conflict (market, symbol) do nothing;
