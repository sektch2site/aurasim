-- Aura sim — метки популярных масок (быстрый поиск по маске)

alter table public.numbers add column if not exists masks text[] not null default '{}';
create index if not exists numbers_masks_gin on public.numbers using gin (masks);

-- разовое заполнение для уже загруженных номеров (точные метки поставит следующая синхронизация)
update public.numbers set masks = array_remove(array[
    case when id ~ '^[0-9][0-9][0-9][0-9][0-9]([0-9])\1\1\1[0-9]$' then '*****AAAA*' end,
    case when id ~ '^[0-9][0-9][0-9][0-9]([0-9])([0-9])\1\2\1\2$' then '****ABABAB' end,
    case when id ~ '^([0-9])\1\1[0-9][0-9][0-9]([0-9])([0-9])\2\3$' then 'AAA***BCBC' end,
    case when id ~ '^[0-9][0-9][0-9][0-9][0-9][0-9]([0-9])([0-9])\1\2$' then '******ABAB' end,
    case when id ~ '^[0-9][0-9][0-9][0-9][0-9][0-9]([0-9])[0]\1[0]$' then '******A0A0' end,
    case when id ~ '^[0-9][0-9][0-9]([0-9])\1\1([0-9])([0-9])\2\3$' then '***AAABCBC' end,
    case when id ~ '^[0-9][0-9][0-9][0-9]([0-9])\1\1\1[0-9][0-9]$' then '****AAAA**' end,
    case when id ~ '^[0-9][0-9][0-9][0-9][0-9][0-9]([0-9])\1\1\1$' then '******AAAA' end,
    case when id ~ '^[0-9][0-9][0-9]([0-9])\1\1[0-9]\1\1\1$' then '***AAA*AAA' end
  ], null);

drop function if exists public.search_numbers(text, text, text, text[], integer, integer, text, boolean, text, integer, integer);
drop function if exists public.search_numbers(text, text, text, text[], integer, integer, text, boolean, text, integer, integer, text);
drop function if exists public.search_numbers(text, text, text, text[], integer, integer, text, boolean, text, integer, integer, text, boolean);

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
  p_offset integer default 0,
  p_mask_tag text default null,
  p_discount boolean default false
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
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price));

  if p_sort = 'price_asc' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_mask_tag is null or p_mask_tag = any(n.masks))
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    order by coalesce(n.price_override, n.partner_price) asc nulls last, n.beauty_score desc
    limit p_limit offset p_offset;
  elsif p_sort = 'price_desc' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_mask_tag is null or p_mask_tag = any(n.masks))
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    order by coalesce(n.price_override, n.partner_price) desc nulls last, n.beauty_score desc
    limit p_limit offset p_offset;
  elsif p_sort = 'new' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_mask_tag is null or p_mask_tag = any(n.masks))
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    order by n.first_seen desc, n.beauty_score desc
    limit p_limit offset p_offset;
  else
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_mask_tag is null or p_mask_tag = any(n.masks))
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
    order by n.beauty_score desc, n.id
    limit p_limit offset p_offset;
  end if;
end $$;

grant execute on function public.search_numbers to anon, authenticated, service_role;
analyze public.numbers;
