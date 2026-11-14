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

/**
 * Бюджетный класс: окончание ABAB (12 12, 40 40, AAA***BCBC), но не ABABAB
 * и без тройки сразу после кода (***AAABCBC остаётся в обычной цене).
 */
export function isBudgetPattern(id: string): boolean {
  if (!/(\d)(?!\1)(\d)\1\2$/.test(id)) return false;
  if (/(\d)(\d)\1\2\1\2$/.test(id)) return false;
  if (id[3] === id[4] && id[4] === id[5]) return false;
  return true;
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
  if (rule && rule.price_from && isBudgetPattern(n.id)) {
    const from = settings.budget_price_from || 5000;
    return { kind: "fixed", price: priceInRange(n, from, Math.max(from, settings.budget_price_to || 7000)), old: null };
  }
  if (rule && rule.price_from) {
    const base = priceInRange(n, rule.price_from, rule.price_to ?? rule.price_from);
    return { kind: "fixed", price: base + laconicBonus(n.id), old: null };
  }
  return { kind: "request" };
}

/**
 * Надбавка за лаконичность: чем меньше разных цифр после кода и чем больше они
 * повторяют цифры кода, тем номер дороже (966 848 44 44 дороже 959 789 44 44).
 */
export function laconicBonus(id: string): number {
  const code = new Set(id.slice(0, 3));
  const body = id.slice(3);
  const uniq = new Set(body);
  let bonus = uniq.size <= 2 ? 8000 : uniq.size === 3 ? 4000 : uniq.size === 4 ? 1000 : 0;
  // все цифры после кода уже есть в коде (966 696 66 99) — ещё лаконичнее
  if (uniq.size <= 3 && [...uniq].every((d) => code.has(d))) bonus += 2000;
  return bonus;
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
  const t = Math.min(1, Math.max(0, 0.8 * (n.beauty_score / 100) + 0.2 * seed(n.id)));
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
