create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  category text not null,
  product_name text not null,
  size text not null default '',
  condition text not null default 'A',
  purchase_price integer not null default 0,
  sell_price integer not null default 0,
  shipping_cost integer not null default 3500,
  packaging_cost integer not null default 500,
  note text not null default '',
  shot_done boolean not null default false,
  post_done boolean not null default false,
  sold_done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

drop policy if exists "public can read items" on public.items;
drop policy if exists "public can insert items" on public.items;
drop policy if exists "public can update items" on public.items;
drop policy if exists "public can delete items" on public.items;

create policy "public can read items"
on public.items
for select
to anon
using (true);

create policy "public can insert items"
on public.items
for insert
to anon
with check (true);

create policy "public can update items"
on public.items
for update
to anon
using (true);

create policy "public can delete items"
on public.items
for delete
to anon
using (true);