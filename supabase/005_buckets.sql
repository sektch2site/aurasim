-- Aura sim — корзины для смешанной выдачи:
--   cheap   — номера с тарифом (цена по правилу) и своя цена до 30 000 ₽
--   premium — выкупные номера (цена в партнёрке) и своя цена дороже 30 000 ₽
--   request — без цены и без правила

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
  p_discount boolean default false,
  p_bucket text default null,
  p_split integer default 30000,
  p_rule_ops text[] default null
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
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
      and (p_bucket is null
        or (p_bucket = 'cheap' and (n.price_override <= p_split or (n.price_override is null and n.partner_price is null and exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max)))))
        or (p_bucket = 'premium' and (n.price_override > p_split or (n.price_override is null and n.partner_price is not null)))
        or (p_bucket = 'request' and n.price_override is null and n.partner_price is null and not exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max))));

  if p_sort = 'price_asc' then
    return query select to_jsonb(n.*), v_total from public.numbers n
    where n.is_active
      and (p_like is null or n.id like p_like) and (p_regex is null or n.id ~ p_regex)
      and (p_mask_tag is null or p_mask_tag = any(n.masks))
      and (p_q is null or n.id like '%' || p_q || '%') and (p_operators is null or n.operator = any(p_operators))
      and (p_tariff_min is null or n.tariff_price >= p_tariff_min) and (p_tariff_max is null or n.tariff_price <= p_tariff_max)
      and (p_region is null or n.region = p_region) and (not p_with_price or coalesce(n.price_override, n.partner_price) is not null)
      and (not p_discount or n.price_old > coalesce(n.price_override, n.partner_price))
      and (p_bucket is null
        or (p_bucket = 'cheap' and (n.price_override <= p_split or (n.price_override is null and n.partner_price is null and exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max)))))
        or (p_bucket = 'premium' and (n.price_override > p_split or (n.price_override is null and n.partner_price is not null)))
        or (p_bucket = 'request' and n.price_override is null and n.partner_price is null and not exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max))))
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
      and (p_bucket is null
        or (p_bucket = 'cheap' and (n.price_override <= p_split or (n.price_override is null and n.partner_price is null and exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max)))))
        or (p_bucket = 'premium' and (n.price_override > p_split or (n.price_override is null and n.partner_price is not null)))
        or (p_bucket = 'request' and n.price_override is null and n.partner_price is null and not exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max))))
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
      and (p_bucket is null
        or (p_bucket = 'cheap' and (n.price_override <= p_split or (n.price_override is null and n.partner_price is null and exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max)))))
        or (p_bucket = 'premium' and (n.price_override > p_split or (n.price_override is null and n.partner_price is not null)))
        or (p_bucket = 'request' and n.price_override is null and n.partner_price is null and not exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max))))
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
      and (p_bucket is null
        or (p_bucket = 'cheap' and (n.price_override <= p_split or (n.price_override is null and n.partner_price is null and exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max)))))
        or (p_bucket = 'premium' and (n.price_override > p_split or (n.price_override is null and n.partner_price is not null)))
        or (p_bucket = 'request' and n.price_override is null and n.partner_price is null and not exists (select 1 from public.price_rules r where r.operator = n.operator and r.price_from is not null and (r.tariff_max is null or n.tariff_price <= r.tariff_max))))
    order by n.beauty_score desc, n.id
    limit p_limit offset p_offset;
  end if;
end $$;

grant execute on function public.search_numbers to anon, authenticated, service_role;
