-- myDATA ingestion: canonical products, private receipts, public price points.

alter table products
  add column if not exists verified boolean not null default false,
  add column if not exists brand text,
  add column if not exists size_value numeric,
  add column if not exists size_unit text,
  add column if not exists name_normalized text,
  add column if not exists taric text,
  add column if not exists merged_into uuid references products(id);

create index if not exists products_name_normalized_idx
  on products (name_normalized);

create table if not exists product_codes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  code text not null,
  code_type text not null check (code_type in ('ean','retailer')),
  chain text,
  created_at timestamptz default now(),
  unique (chain, code, code_type)
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  receipt_hash text not null unique,
  mydata_mark text,
  item_count int,
  bought_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description_raw text not null,
  qty numeric,
  unit_price numeric,
  line_total numeric,
  vat_rate numeric,
  created_at timestamptz default now()
);

create table if not exists price_points (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric not null,
  vat_rate numeric,
  unit text,
  source_receipt_id uuid references receipts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists price_points_lookup
  on price_points (product_id, store_id, created_at desc);

-- The only object the client may read for prices. Omits user_id and
-- source_receipt_id by construction, and hides unverified products.
drop view if exists public.product_price_latest;
create view public.product_price_latest
with (security_invoker = true) as
select distinct on (pp.product_id, pp.store_id)
  pp.product_id, pp.store_id, pp.price, pp.vat_rate, pp.unit,
  pp.created_at as observed_at
from price_points pp
join products p on p.id = pp.product_id
where p.merged_into is null and p.verified
order by pp.product_id, pp.store_id, pp.created_at desc;

alter table products enable row level security;
alter table product_codes enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table price_points enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "public read product_codes" on product_codes;
create policy "public read product_codes" on product_codes for select using (true);
drop policy if exists "authenticated insert products" on products;
create policy "authenticated insert products" on products for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "own receipts" on receipts;
create policy "own receipts" on receipts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own receipt_items" on receipt_items;
create policy "own receipt_items" on receipt_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public read price_points" on price_points;
create policy "public read price_points" on price_points for select using (true);
drop policy if exists "authenticated insert price_points" on price_points;
create policy "authenticated insert price_points" on price_points for insert
  with check (auth.role() = 'authenticated');
