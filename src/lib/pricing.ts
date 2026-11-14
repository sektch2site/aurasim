import type { PhoneNumber, PriceRule, ResolvedPrice, Settings } from "./types";

export function roundPrice(v: number, to: number): number {
  const step = to > 0 ? to : 1;
  return Math.round(v / step) * step;
}

/** Подходящее правило: по оператору, с минимальным tariff_max, который >= тарифа номера */
export function findRule(n: Pick<PhoneNumber, "operator" | "tariff_price">, rules: PriceRule[]): PriceRule | null {
  const candidates = rules
    .filter((r) => r.operator === n.operator)
    .filter((r) => r.tariff_max === null || (n.tariff_price ?? Infinity) <= r.tariff_max)
    .sort((a, b) => (a.tariff_max ?? Infinity) - (b.tariff_max ?? Infinity));
  return candidates[0] ?? null;
}

/**
 * Приоритет цены:
 * 1. ручная цена из админки
 * 2. цена из партнёрки (+ наценка, округление)
 * 3. диапазон по правилу оператор/тариф
 * 4. «Запросить цену»
 */
/** То же правило, что колонка numbers.vip в базе */
export function isVipPattern(id: string): boolean {
  return /(\d)\1{5}/.test(id) || /(\d)\1{4}$/.test(id) || /^\d{3}(\d)\1{4}(\d)\2$/.test(id);
}

export function resolvePrice(n: PhoneNumber, rules: PriceRule[], settings: Settings): ResolvedPrice {
  if (n.price_override && n.price_override > 0) {
    return { kind: "fixed", price: n.price_override, old: n.price_old };
  }
  // особые номера (6 одинаковых подряд, 5 одинаковых на конце, ***AAAAABB) — всегда по запросу
  if (isVipPattern(n.id)) return { kind: "request" };
  if (n.partner_price && n.partner_price > 0) {
    const p = roundPrice(n.partner_price * (1 + settings.markup_percent / 100), settings.round_to);
    // дорогие выкупные номера — без цены, покупатель спрашивает её у менеджера
    if (settings.hide_buyout_price) return { kind: "request" };
    return { kind: "fixed", price: p, old: n.price_old };
  }
  const rule = findRule(n, rules);
  if (rule && rule.price_from) {
    return { kind: "fixed", price: priceInRange(n, rule.price_from, rule.price_to ?? rule.price_from), old: null };
  }
  return { kind: "request" };
}

/** Стабильное «случайное» число 0..1 по номеру (одинаковое при каждом показе) */
function seed(id: string): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

/** Конкретная цена внутри диапазона правила: чем красивее номер — тем ближе к верху. Шаг 1000 ₽. */
export function priceInRange(n: Pick<PhoneNumber, "id" | "beauty_score">, from: number, to: number): number {
  if (to <= from) return from;
  const t = Math.min(1, Math.max(0, 0.6 * (n.beauty_score / 100) + 0.4 * seed(n.id)));
  return Math.round((from + (to - from) * t) / 1000) * 1000;
}

export function priceSortValue(p: ResolvedPrice): number {
  if (p.kind === "fixed") return p.price;
  if (p.kind === "range") return p.from;
  return Number.MAX_SAFE_INTEGER;
}

export function formatRub(v: number): string {
  return new Intl.NumberFormat("ru-RU").format(v).replace(/ /g, " ") + " ₽";
}
