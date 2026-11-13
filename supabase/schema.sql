-- Aura sim — схема БД. Выполнить один раз в Supabase → SQL Editor.

create extension if not exists pg_trgm;

-- Номера
create table if not exists public.numbers (
  id              text primary key check (id ~ '^[0-9]{10}$'),
  operator        text not null default 'other',
  region          text,
  tariff_name     text,
  tariff_price    integer,
  partner_price   integer,
  price_override  integer,
  price_old       integer,
  beauty_score    integer not null default 0,
  beauty_mask     text not null default '0000000000',
  tags            text[] not null default '{}',
  is_active       boolean not null default true,
  source          text not null default 'partner',
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  sync_run        bigint
);
create index if not exists numbers_active_score on public.numbers (is_active, beauty_score desc);
create index if not exists numbers_operator on public.numbers (operator);
create index if not exists numbers_id_trgm on public.numbers using gin (id gin_trgm_ops);

-- Ручная подборка под поиском
create table if not exists public.featured (
  number_id text primary key references public.numbers(id) on delete cascade,
  position  integer not null default 0
);

-- Пары / тройки
create table if not exists public.bundles (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('pair','trio')),
  title      text,
  numbers    text[] not null,
  price      integer,
  price_old  integer,
  is_active  boolean not null default true,
  position   integer not null default 0
);

-- Правила цен по оператору и тарифу
create table if not exists public.price_rules (
  id          uuid primary key default gen_random_uuid(),
  operator    text not null,
  tariff_max  integer,
  price_from  integer,
  price_to    integer,
  tariff_note text
);

-- Выгодные тарифы
create table if not exists public.tariffs (
  id          uuid primary key default gen_random_uuid(),
  operator    text not null,
  name        text not null,
  price       integer not null,
  description text,
  position    integer not null default 0
);

-- Настройки (одна строка)
create table if not exists public.settings (
  id    integer primary key default 1 check (id = 1),
  data  jsonb not null default '{}'::jsonb
);
insert into public.settings (id, data) values (1, '{}') on conflict do nothing;

-- Журнал синхронизаций
create table if not exists public.sync_runs (
  id         bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  added      integer default 0,
  updated    integer default 0,
  removed    integer default 0,
  error      text
);

-- Поиск по маске/шаблону (регулярка с обратными ссылками)
create or replace function public.search_numbers(
  p_like text default null,
  p_regex text default null,
  p_q text default null,
  p_operators text[] default null,
  p_tariff_min integer default null,
  p_tariff_max integer default null,
  p_region text default null,
  p_with_price boolean default false,
  p_sort text default 'beauty',
  p_limit integer default 60,
  p_offset integer default 0
) returns table (row_data jsonb, total bigint)
language sql stable as $$
  with f as (
    select n.* from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like)
      and (p_regex is null or n.id ~ p_regex)
      and (p_q is null or n.id like '%' || p_q || '%')
      and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min)
      and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region)
      and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
  )
  select to_jsonb(f.*), count(*) over ()
  from f
  order by
    case when p_sort = 'price_asc' then coalesce(f.price_override, f.partner_price, 2147483647) end asc,
    case when p_sort = 'price_desc' then coalesce(f.price_override, f.partner_price, 0) end desc,
    case when p_sort = 'new' then f.first_seen end desc,
    f.beauty_score desc, f.id
  limit p_limit offset p_offset;
$$;

-- RLS: читать могут все, писать — только сервер (service role)
alter table public.numbers     enable row level security;
alter table public.featured    enable row level security;
alter table public.bundles     enable row level security;
alter table public.price_rules enable row level security;
alter table public.tariffs     enable row level security;
alter table public.settings    enable row level security;
alter table public.sync_runs   enable row level security;

do $$ begin
  create policy "public read" on public.numbers     for select using (true);
  create policy "public read" on public.featured    for select using (true);
  create policy "public read" on public.bundles     for select using (true);
  create policy "public read" on public.price_rules for select using (true);
  create policy "public read" on public.tariffs     for select using (true);
  create policy "public read" on public.settings    for select using (true);
exception when duplicate_object then null; end $$;

-- Стартовое правило из переписки с клиентом
insert into public.price_rules (operator, tariff_max, price_from, price_to, tariff_note)
select 'mts', 950, 9000, 15000, 'тариф до 950 ₽/мес'
where not exists (select 1 from public.price_rules);
