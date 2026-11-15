-- Aura sim — цена для сортировки/фильтра (считается в коде: site_price), фильтр по цене,
-- дешёвые (< p_low) в конце, проходные номера скрываются кодом (is_active=false).
alter table public.numbers add column if not exists site_price integer;
create index if not exists numbers_ep_idx on public.numbers ((coalesce(price_override, site_price))) where is_active;

drop function if exists public.search_numbers(text, text, text, text[], integer, integer, text, boolean, text, integer, integer, text, boolean, text, integer, text[]);

create or replace function public.search_numbers(
  p_like text default null, p_regex text default null, p_q text default null, p_operators text[] default null,
  p_tariff_min integer default null, p_tariff_max integer default null, p_region text default null,
  p_with_price boolean default false, p_sort text default 'beauty', p_limit integer default 60, p_offset integer default 0,
  p_mask_tag text default null, p_discount boolean default false, p_bucket text default null,
  p_split integer default 30000, p_rule_ops text[] default null,
  p_price_min integer default null, p_price_max integer default null, p_low integer default 5000
) returns table (row_data jsonb, total bigint)
language plpgsql stable as $$
declare
  v_total bigint;
begin
  select count(*) into v_total from public.numbers n
  where n.is_active
    and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
    and (p_mask_tag is null or p_mask_tag = any(n.masks))
    and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
    and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
    and (p_region is null or n.region = p_region)
    and (not p_with_price or coalesce(n.price_override, n.site_price) is not null)
    and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    and (p_price_min is null or coalesce(n.price_override, n.site_price) >= p_price_min)
    and (p_price_max is null or coalesce(n.price_override, n.site_price) <= p_price_max)
    and (p_bucket is null
      or (p_bucket = 'cheap' and coalesce(n.price_override, n.site_price) >= p_low and coalesce(n.price_override, n.site_price) <= p_split)
      or (p_bucket = 'low' and coalesce(n.price_override, n.site_price) < p_low)
      or (p_bucket = 'premium' and (coalesce(n.price_override, n.site_price) > p_split or (coalesce(n.price_override, n.site_price) is null and (n.partner_price is not null or n.vip))))
      or (p_bucket = 'request' and coalesce(n.price_override, n.site_price) is null and n.partner_price is null and not n.vip));

  return query select to_jsonb(n.*), v_total from public.numbers n
  where n.is_active
    and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
    and (p_mask_tag is null or p_mask_tag = any(n.masks))
    and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
    and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
    and (p_region is null or n.region = p_region)
    and (not p_with_price or coalesce(n.price_override, n.site_price) is not null)
    and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    and (p_price_min is null or coalesce(n.price_override, n.site_price) >= p_price_min)
    and (p_price_max is null or coalesce(n.price_override, n.site_price) <= p_price_max)
    and (p_bucket is null
      or (p_bucket = 'cheap' and coalesce(n.price_override, n.site_price) >= p_low and coalesce(n.price_override, n.site_price) <= p_split)
      or (p_bucket = 'low' and coalesce(n.price_override, n.site_price) < p_low)
      or (p_bucket = 'premium' and (coalesce(n.price_override, n.site_price) > p_split or (coalesce(n.price_override, n.site_price) is null and (n.partner_price is not null or n.vip))))
      or (p_bucket = 'request' and coalesce(n.price_override, n.site_price) is null and n.partner_price is null and not n.vip))
  order by
    case when p_sort = 'price_asc' then coalesce(n.price_override, n.site_price) end asc nulls last,
    case when p_sort = 'price_desc' then coalesce(n.price_override, n.site_price) end desc nulls last,
    case when p_sort not in ('price_asc', 'price_desc') then coalesce(n.price_override, n.site_price, 1000000000) < p_low end asc,
    case when p_sort = 'new' then n.first_seen end desc,
    n.beauty_score desc, n.id
  limit p_limit offset p_offset;
end $$;

grant execute on function public.search_numbers to anon, authenticated, service_role;
