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
export function resolvePrice(n: PhoneNumber, rules: PriceRule[], settings: Settings): ResolvedPrice {
  if (n.price_override && n.price_override > 0) {
    return { kind: "fixed", price: n.price_override, old: n.price_old };
  }
  if (n.partner_price && n.partner_price > 0) {
    const p = roundPrice(n.partner_price * (1 + settings.markup_percent / 100), settings.round_to);
    return { kind: "fixed", price: p, old: n.price_old };
  }
  const rule = findRule(n, rules);
  if (rule && rule.price_from) {
    return { kind: "range", from: rule.price_from, to: rule.price_to ?? rule.price_from };
  }
  return { kind: "request" };
}

export function priceSortValue(p: ResolvedPrice): number {
  if (p.kind === "fixed") return p.price;
  if (p.kind === "range") return p.from;
  return Number.MAX_SAFE_INTEGER;
}

export function formatRub(v: number): string {
  return new Intl.NumberFormat("ru-RU").format(v).replace(/ /g, " ") + " ₽";
}
