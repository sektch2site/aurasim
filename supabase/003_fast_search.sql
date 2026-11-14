-- Aura sim — быстрый поиск на больших объёмах (100k+ номеров)

create index if not exists numbers_score_id on public.numbers (beauty_score desc, id) where is_active;
create index if not exists numbers_price_idx on public.numbers ((coalesce(price_override, partner_price))) where is_active;
create index if not exists numbers_first_seen_idx on public.numbers (first_seen desc) where is_active;

drop function if exists public.search_numbers(text, text, text, text[], integer, integer, text, boolean, text, integer, integer);

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
language plpgsql stable as $$
declare
  v_total bigint;
begin
  select count(*) into v_total
  from public.numbers n
  where n.is_active
    and (p_like is null or n.id like p_like)
    and (p_regex is null or n.id ~ p_regex)
    and (p_q is null or n.id like '%' || p_q || '%')
    and (p_operators is null or n.operator = any(p_operators))
    and (p_tariff_min is null or n.tariff_price >= p_tariff_min)
    and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
    and (p_region is null or n.region = p_region)
    and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null);

  if p_sort = 'price_asc' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
    order by coalesce(n.price_override, n.partner_price) asc nulls last, n.beauty_score desc
    limit p_limit offset p_offset;
  elsif p_sort = 'price_desc' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
    order by coalesce(n.price_override, n.partner_price) desc nulls last, n.beauty_score desc
    limit p_limit offset p_offset;
  else
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
    order by n.beauty_score desc, n.id
    limit p_limit offset p_offset;
  end if;
end $$;

grant execute on function public.search_numbers to anon, authenticated, service_role;
analyze public.numbers;
