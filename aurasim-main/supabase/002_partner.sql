-- Aura sim — синхронизация с партнёркой «Агентство Связи»

alter table public.numbers add column if not exists is_cis boolean;
alter table public.numbers add column if not exists partner_op integer;

-- Сессия кабинета партнёра. Читает/пишет только сервер (service role), публичного доступа нет.
create table if not exists public.partner_session (
  id          integer primary key default 1 check (id = 1),
  cookie      text,
  status      text not null default 'empty',   -- empty | ok | expired | error
  message     text,
  checked_at  timestamptz,
  updated_at  timestamptz not null default now()
);
insert into public.partner_session (id) values (1) on conflict do nothing;
alter table public.partner_session enable row level security;
grant all on public.partner_session to service_role;

alter table public.sync_runs add column if not exists scanned integer default 0;
grant all on public.sync_runs to service_role;
grant all on all sequences in schema public to service_role;
