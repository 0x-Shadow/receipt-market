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
  created_at timestamptz default now()
);

create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  store_id uuid references stores(id),
  image_url text,
  total numeric,
  bought_at timestamptz default now()
);

create table if not exists prices (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  receipt_id uuid references receipts(id) on delete set null,
  price numeric not null,
  created_at timestamptz default now()
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

alter table stores enable row level security;
alter table products enable row level security;
alter table receipts enable row level security;
alter table prices enable row level security;
alter table watchlist enable row level security;
alter table community_posts enable row level security;

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
create policy "auth write prices" on prices for insert with check (auth.role() = 'authenticated');
drop policy if exists "public read community_posts" on community_posts;
create policy "public read community_posts" on community_posts for select using (true);
drop policy if exists "auth write community_posts" on community_posts;
create policy "auth write community_posts" on community_posts for insert with check (auth.role() = 'authenticated');

create index if not exists community_posts_created_at_idx on community_posts(created_at desc);

create or replace view price_history as
select
  p.id as price_id,
  p.product_id,
  pr.name_el as product_name,
  p.store_id,
  s.chain as store_chain,
  p.price,
  p.created_at,
  lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at) as previous_price,
  p.price - lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at) as price_change,
  round(((p.price - lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at)) / nullif(lag(p.price) over (partition by p.product_id, p.store_id order by p.created_at), 0)) * 100, 2) as change_percent
from prices p
join products pr on pr.id = p.product_id
join stores s on s.id = p.store_id
order by p.created_at desc;

-- Seed stores
insert into stores (chain, name, address) values
('Sklavenitis','Σκλαβενίτης Χαλάνδρι','Λ. Κηφισίας 100'),
('Lidl','Lidl Μαρούσι','Λ. Κηφισίας 50'),
('Masoutis','Μασούτης Ν. Σμύρνη','Ελευθερίου Βενιζέλου 20'),
('AB','ΑΒ Βασιλόπουλος Γλυφάδα','Λ. Βουλιαγμένης 80'),
('My Market','My Market Περιστέρι','Π. Τσαλδάρη 40')
on conflict do nothing;

-- Seed products (sample of 120 — extend freely)
insert into products (name_el, category, emoji) values
('ΦΕΤΑ ΠΟΠ 400G','Γαλακτοκομικά','🧀'),
('ΓΑΛΑ ΦΡΕΣΚΟ 1L','Γαλακτοκομικά','🥛'),
('ΓΡΑΒΙΕΡΑ ΚΡΗΤΗΣ','Γαλακτοκομικά','🧀'),
('ΓΙΑΟΥΡΤΙ ΣΤΡΑΓΓΙΣΤΟ','Γαλακτοκομικά','🍦'),
('ΨΩΜΙ ΤΟΣΤ','Αρτοποιία','🍞'),
('ΜΑΚΑΡΟΝΙΑ 500G','Τρόφιμα','🍝'),
('ΡΥΖΙ 1KG','Τρόφιμα','🍚'),
('ΕΛΑΙΟΛΑΔΟ 1L','Τρόφιμα','🫒'),
('ΜΠΑΝΑΝΕΣ 1KG','Φρούτα & Λαχανικά','🍌'),
('ΝΤΟΜΑΤΕΣ 1KG','Φρούτα & Λαχανικά','🍅'),
('ΚΟΤΟΠΟΥΛΟ 1KG','Κρέας & Ψάρι','🍗'),
('ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ','Ποτά','☕'),
('ΑΥΓΑ 6ΤΕΜ','Γαλακτοκομικά','🥚')
on conflict (name_el) do nothing;
