-- receipt-market schema — paste into Supabase SQL Editor, Run.
-- Postgres + RLS + seed: stores, products (120 Greek), prices, receipts, watchlist.
-- Storage: Dashboard → Storage → New bucket `receipts`, Private (receipt images).

create extension if not exists "uuid-ossp";

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  chain text not null,
  name text not null,
  address text,
  lat float, lng float,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name_el text not null unique,
  category text not null default 'Άλλα',
  emoji text default '🛒',
  barcode text,
  created_at timestamptz default now()
);

create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  store_id uuid references stores(id),
  image_url text,
  total numeric,
  item_count int,
  parsed_confidence float,
  bought_at timestamptz default now()
);

create table if not exists prices (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  receipt_id uuid references receipts(id) on delete set null,
  price numeric not null,
  freshness text default 'current' check (freshness in ('current', 'stale', 'outdated')),
  created_at timestamptz default now() not null
);

create table if not exists watchlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  target_price numeric,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

create table if not exists community_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  store text,
  likes int not null default 0,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table stores enable row level security;
alter table products enable row level security;
alter table receipts enable row level security;
alter table prices enable row level security;
alter table watchlist enable row level security;
alter table community_posts enable row level security;
alter table profiles enable row level security;

drop policy if exists "public read stores" on stores;
create policy "public read stores" on stores for select using (true);
drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "public read prices" on prices;
create policy "public read prices" on prices for select using (true);
drop policy if exists "auth write receipts" on receipts;
create policy "auth write receipts" on receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own watchlist" on watchlist;
create policy "own watchlist" on watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "auth write prices" on prices;
create policy "auth write prices" on prices for insert with check (
  auth.role() = 'authenticated'
  and (
    receipt_id is null
    or auth.uid() = (select user_id from receipts where id = receipt_id)
  )
);
drop policy if exists "public read community_posts" on community_posts;
create policy "public read community_posts" on community_posts for select using (true);
drop policy if exists "auth write community_posts" on community_posts;
create policy "auth write community_posts" on community_posts for insert with check (auth.role() = 'authenticated');
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create index if not exists community_posts_created_at_idx on community_posts(created_at desc);

-- Makes the stores seed idempotent (on conflict do nothing needs a real target).
create unique index if not exists stores_chain_name_idx on stores(chain, name);

-- Anti-spam: one price row per product/store/price/day.
-- COALESCE is required because NULLs are distinct in a btree index, so a plain
-- (product_id, store_id, price, day) index would still allow duplicates
-- whenever product_id or store_id is null.
-- date(timezone('utc', created_at)) is used instead of a ::date cast so the
-- whole expression stays an immutable function call, which is what a btree
-- index requires.
create unique index if not exists prices_dedupe_idx
  on prices (
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid),
    price,
    date(timezone('utc', created_at))
  );

-- Mark prices older than 30 days as stale
create or replace function mark_stale_prices()
returns trigger
language plpgsql
as $$
begin
  update prices
  set freshness = 'stale'
  where created_at < now() - interval '30 days'
    and freshness = 'current';
  return new;
end;
$$;

drop trigger if exists trg_mark_stale_prices on prices;
create trigger trg_mark_stale_prices
  after insert on prices
  for each statement
  execute function mark_stale_prices();

-- Security invoker so the view honours the querying user's RLS instead of
-- running with the view owner's privileges (Postgres views are
-- security-definer by default, which would bypass the table policies below).
-- Requires Postgres 15+. The drop/recreate avoids CREATE OR REPLACE being
-- unable to change the security_invoker option on an existing view.
drop view if exists public.price_history;
create view public.price_history
with (security_invoker = true)
as
select
  p.id as price_id,
  p.product_id,
  pr.name_el as product_name,
  p.store_id,
  s.chain as store_chain,
  p.price,
  p.freshness,
  p.created_at,
  lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at) as previous_price,
  p.price - lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at) as price_change,
  round(((p.price - lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at)) / nullif(lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at), 0)) * 100, 2) as change_percent
from public.prices p
join public.products pr on pr.id = p.product_id
join public.stores s on s.id = p.store_id
order by p.created_at desc;

-- Seed stores
insert into stores (chain, name, address) values
('Sklavenitis','Σκλαβενίτης Χαλάνδρι','Λ. Κηφισίας 100'),
('Lidl','Lidl Μαρούσι','Λ. Κηφισίας 50'),
('Masoutis','Μασούτης Ν. Σμύρνη','Ελευθερίου Βενιζέλου 20'),
('AB','ΑΒ Βασιλόπουλος Γλυφάδα','Λ. Βουλιαγμένης 80'),
('My Market','My Market Περιστέρι','Π. Τσαλδάρη 40')
on conflict (chain, name) do nothing;

-- Seed products (sample of 120 — extend freely)
insert into products (name_el, category, emoji) values
('ΦΕΤΑ ΠΟΠ 400G','Γαλακτοκομικά','🧀'),
('ΓΑΛΑ ΦΡΕΣΚΟ 1L','Γαλακτοκομικά','🥛'),
('ΓΡΑΒΙΕΡΑ ΚΡΗΤΗΣ','Γαλακτοκομικά','🧀'),
('ΓΙΑΟΥΡΤΙ ΣΤΡΑΓΓΙΣΤΟ','Γαλακτοκομικά','🍦'),
('ΨΩΜΙ ΤΟΣΤ','Αρτοποία','🍞'),
('ΜΑΚΑΡΟΝΙΑ 500G','Τρόφιμα','🍝'),
('ΡΥΖΙ 1KG','Τρόφιμα','🍚'),
('ΕΛΑΙΟΛΑΔΟ 1L','Τρόφιμα','🫒'),
('ΜΠΑΝΑΝΕΣ 1KG','Φρούτα & Λαχανικά','🍌'),
('ΝΤΟΜΑΤΕΣ 1KG','Φρούτα & Λαχανικά','🍅'),
('ΚΟΤΟΠΟΥΛΟ 1KG','Κρέας & Ψάρι','🍗'),
('ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ','Ποτά','☕'),
('ΑΥΓΑ 6ΤΕΜ','Γαλακτοκομικά','🥚')
on conflict (name_el) do nothing;
