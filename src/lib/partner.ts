import { analyzeBeauty } from "./beauty";
import { matchMask, POPULAR_MASKS } from "./mask";
import { isJunkNumber, resolvePrice } from "./pricing";
import type { PhoneNumber, PriceRule, Settings } from "./types";

/**
 * Цена для сортировки и фильтра в базе (без ручной цены — её база берёт сама) и «проходной» ли номер.
 * Проходные (слабый узор + случайный конец) на сайт не выкладываем.
 */
export function priceFields(
  n: Pick<PhoneNumber, "id" | "operator" | "beauty_score" | "tariff_price" | "partner_price">,
  rules: PriceRule[],
  settings: Settings,
) {
  const p = resolvePrice({ ...(n as PhoneNumber), price_override: null, price_old: null }, rules, settings);
  return {
    site_price: p.kind === "fixed" ? p.price : null,
    junk: !n.partner_price && isJunkNumber(n.id),
  };
}

/** Какие популярные маски подходят номеру — для быстрого поиска */
/** «…ABAB» и «…A0A0» — бюджетные окончания; номера с ABABAB на конце живут в маске «****ABABAB» */
const ENDS_ABABAB = /(\d)(\d)\1\2\1\2$/;
export const maskTags = (id: string) =>
  POPULAR_MASKS.filter((m) => matchMask(id, m) && !((m === "******ABAB" || m === "******A0A0") && ENDS_ABABAB.test(id)));

/** Запись номера из кабинета «Агентство Связи» (урезанная раннером) */
export interface PartnerItem {
  number: string;
  operator: number;
  status?: number;
  /** своя бронь Ильи — показываем всегда */
  _own?: boolean;
  region?: { name?: string } | null;
  minCost?: number | string | null;
  price?: number | string | null;
  isCis?: boolean;
  tariffs?: { name: string; costForSearch: number | string }[];
}

/** Коды операторов в кабинете: 1 Билайн, 2 МегаФон, 3 МТС, 5 Yota, 8 T2, 17 Билайн (D) */
const OPERATORS: Record<number, string> = { 1: "beeline", 2: "megafon", 3: "mts", 5: "yota", 8: "t2", 17: "beeline" };

export function partnerToRow(it: PartnerItem, runId: number, now: string, rules: PriceRule[] = [], settings?: Settings) {
  const id = String(it.number ?? "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(id)) return null;
  const minCost = Number(it.minCost) || null;
  const tariff = it.tariffs?.find((t) => Number(t.costForSearch) === minCost) ?? it.tariffs?.[0];
  const b = analyzeBeauty(id);
  const operator = OPERATORS[it.operator] ?? "other";
  const partner_price = Number(it.price) > 0 ? Number(it.price) : null;
  const pf = settings
    ? priceFields({ id, operator, beauty_score: b.score, tariff_price: minCost, partner_price } as never, rules, settings)
    : { site_price: null, junk: false };
  return {
    id,
    operator,
    partner_op: it.operator,
    region: it.region?.name ?? null,
    tariff_name: tariff?.name?.replace(/&infin;/g, "∞") ?? null,
    tariff_price: minCost,
    partner_price,
    site_price: pf.site_price,
    is_cis: it.isCis ?? null,
    beauty_score: b.score,
    beauty_mask: b.mask,
    tags: b.tags,
    masks: maskTags(id),
    is_active: it._own || !pf.junk,
    source: "partner",
    last_seen: now,
    sync_run: runId,
  };
}
