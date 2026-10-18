-- Starter list of assets. Verify symbols and provider references before going
-- live, and add your own from the Admin page.
--
-- provider_ref formats (see docs/DATA_SOURCES.md):
--   casablanca  → ticker as published in your Casablanca feed
--   us/europe   → Twelve Data "SYMBOL" or "SYMBOL|EXCHANGE"
--   commodities → Twelve Data pair, e.g. "XAU/USD"
--   crypto      → CoinGecko coin id

insert into public.assets (symbol, name, asset_class, market, currency, exchange, provider_ref, keywords) values
  -- Bourse de Casablanca
  ('MASI', 'MASI (indice)',              'index', 'casablanca', 'MAD', 'BVC', 'MASI', array['masi']),
  ('ATW',  'Attijariwafa Bank',          'stock', 'casablanca', 'MAD', 'BVC', 'ATW',  array['attijariwafa']),
  ('IAM',  'Maroc Telecom',              'stock', 'casablanca', 'MAD', 'BVC', 'IAM',  array['maroc telecom', 'itissalat al-maghrib']),
  ('LHM',  'LafargeHolcim Maroc',        'stock', 'casablanca', 'MAD', 'BVC', 'LHM',  array['lafargeholcim']),
  ('MNG',  'Managem',                    'stock', 'casablanca', 'MAD', 'BVC', 'MNG',  array['managem']),
  ('MSA',  'Marsa Maroc',                'stock', 'casablanca', 'MAD', 'BVC', 'MSA',  array['marsa maroc']),
  ('HPS',  'HPS',                        'stock', 'casablanca', 'MAD', 'BVC', 'HPS',  array['hps', 'hightech payment systems']),
  ('TGC',  'TGCC',                       'stock', 'casablanca', 'MAD', 'BVC', 'TGC',  array['tgcc']),
  ('AKT',  'Akdital',                    'stock', 'casablanca', 'MAD', 'BVC', 'AKT',  array['akdital']),
  ('CAP',  'Cash Plus',                  'stock', 'casablanca', 'MAD', 'BVC', 'CAP',  array['cash plus']),
  ('TQM',  'Taqa Morocco',               'stock', 'casablanca', 'MAD', 'BVC', 'TQM',  array['taqa morocco']),
  -- United States
  ('AAPL', 'Apple',                      'stock', 'us', 'USD', 'NASDAQ', 'AAPL', array['apple']),
  ('MSFT', 'Microsoft',                  'stock', 'us', 'USD', 'NASDAQ', 'MSFT', array['microsoft']),
  ('NVDA', 'NVIDIA',                     'stock', 'us', 'USD', 'NASDAQ', 'NVDA', array['nvidia']),
  ('AMZN', 'Amazon',                     'stock', 'us', 'USD', 'NASDAQ', 'AMZN', array['amazon']),
  ('SPY',  'SPDR S&P 500 ETF',           'etf',   'us', 'USD', 'NYSE',   'SPY',  array['s&p 500']),
  ('QQQ',  'Invesco QQQ Trust',          'etf',   'us', 'USD', 'NASDAQ', 'QQQ',  array['nasdaq-100']),
  ('VT',   'Vanguard Total World Stock', 'etf',   'us', 'USD', 'NYSE',   'VT',   array['vanguard total world']),
  -- Europe
  ('MC',   'LVMH',                       'stock', 'europe', 'EUR', 'Euronext Paris', 'MC|Euronext',  array['lvmh']),
  ('AI',   'Air Liquide',                'stock', 'europe', 'EUR', 'Euronext Paris', 'AI|Euronext',  array['air liquide']),
  ('TTE',  'TotalEnergies',              'stock', 'europe', 'EUR', 'Euronext Paris', 'TTE|Euronext', array['totalenergies']),
  ('CW8',  'Amundi MSCI World',          'etf',   'europe', 'EUR', 'Euronext Paris', 'CW8|Euronext', array['msci world']),
  -- Commodities
  ('XAU',  'Gold (ounce)',               'commodity', 'commodities', 'USD', null, 'XAU/USD', array['gold', 'or ']),
  ('XAG',  'Silver (ounce)',             'commodity', 'commodities', 'USD', null, 'XAG/USD', array['silver', 'argent métal']),
  -- Crypto
  ('BTC',  'Bitcoin',                    'crypto', 'crypto', 'USD', null, 'bitcoin',  array['bitcoin']),
  ('ETH',  'Ethereum',                   'crypto', 'crypto', 'USD', null, 'ethereum', array['ethereum']),
  ('SOL',  'Solana',                     'crypto', 'crypto', 'USD', null, 'solana',   array['solana'])
on conflict (market, symbol) do nothing;
