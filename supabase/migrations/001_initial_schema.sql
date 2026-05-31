-- Political Catalyst Radar — initial schema

create extension if not exists "pgcrypto";

create table company_dictionary (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  cik text,
  company_name text not null,
  exchange text,
  sector text,
  industry text,
  sector_etf text,
  aliases jsonb default '[]'::jsonb,
  people jsonb default '[]'::jsonb,
  themes jsonb default '[]'::jsonb,
  is_common_word_ticker boolean default false,
  requires_context boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create unique index company_dictionary_ticker_idx on company_dictionary (ticker);

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text,
  source_name text,
  source_url text unique,
  title text,
  published_at timestamptz,
  detected_at timestamptz default now(),
  raw_html text,
  extracted_text text,
  content_hash text,
  processed boolean default false,
  fetch_error text,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  event_datetime timestamptz,
  detected_at timestamptz default now(),
  source_type text not null,
  source_name text,
  source_url text,
  source_hash text unique,
  speaker text,
  title text,
  raw_text text not null,
  normalized_text text,
  event_type text,
  sentiment text,
  policy_domain text,
  catalyst_type text,
  freshness_class text,
  direction text,
  score integer,
  alert_level text,
  reason_codes jsonb,
  score_breakdown jsonb,
  score_mode text,
  origin text not null default 'manual',
  status text default 'active',
  classifier_version text,
  scoring_version text,
  ai_raw_classification jsonb,
  ai_summary text,
  cluster_id uuid,
  dictionary_asof date,
  created_at timestamptz default now()
);

create index events_detected_at_idx on events (detected_at desc);
create index events_score_idx on events (score);
create index events_origin_status_idx on events (origin, status);

create table event_entities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  entity_text text not null,
  entity_type text,
  company_name text,
  ticker text,
  cik text,
  exchange text,
  sector text,
  industry text,
  themes jsonb,
  resolver_confidence numeric,
  match_type text,
  is_direct_company_mention boolean default false,
  is_ceo_mention boolean default false,
  is_sector_mention boolean default false,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table market_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  ticker text,
  snapshot_time timestamptz default now(),
  price numeric,
  previous_close numeric,
  open numeric,
  high numeric,
  low numeric,
  volume numeric,
  avg_volume numeric,
  market_cap numeric,
  day_return numeric,
  volume_zscore numeric,
  provider text,
  created_at timestamptz default now()
);

create table forward_returns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  ticker text,
  sector_etf text,
  horizon text,
  due_at timestamptz,
  measured_at timestamptz,
  start_price numeric,
  end_price numeric,
  raw_return numeric,
  spy_return numeric,
  qqq_return numeric,
  sector_return numeric,
  excess_return_vs_sector numeric,
  excess_return_vs_spy numeric,
  excess_return_vs_qqq numeric,
  status text default 'pending',
  created_at timestamptz default now()
);

create index forward_returns_status_due_idx on forward_returns (status, due_at);

alter table company_dictionary enable row level security;
alter table source_documents enable row level security;
alter table events enable row level security;
alter table event_entities enable row level security;
alter table market_snapshots enable row level security;
alter table forward_returns enable row level security;
