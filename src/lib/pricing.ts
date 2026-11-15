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

/** ***X AAAAA Y — ровно пять одинаковых в середине (977 933 33 34, 901 533 33 36) */
export function isFiveMiddle(id: string): boolean {
  const m = /^\d{3}(\d)(\d)\2\2\2\2(\d)$/.exec(id);
  return !!m && m[1] !== m[2] && m[3] !== m[2];
}

/** ***AAAAA XY — пять одинаковых сразу после кода и две другие на конце (991 222 22 15) */
export function isFiveStart(id: string): boolean {
  const m = /^\d{3}(\d)\1\1\1\1(\d)(\d)$/.exec(id);
  return !!m && m[2] !== m[1] && m[3] !== m[1] && m[2] !== m[3];
}

/**
 * Комбинации с отдельной ценой (по просьбе Ильи). Проверяются по порядку, первая подходящая побеждает.
 * b — 7 цифр после кода.
 */
export const PATTERN_PRICES: { name: string; example: string; from: number; to: number; test: (b: string) => boolean }[] = [
  // ***AB0ABAB — 985 120 12 12
  { name: "***AB0ABAB", example: "985 120 12 12", from: 10000, to: 10000, test: (b) => /^([1-9])([1-9])0\1\2\1\2$/.test(b) && b[0] !== b[1] },
  // ***AAABCBC — 985 111 58 58
  { name: "***AAABCBC", example: "985 111 58 58", from: 10000, to: 13000, test: (b) => /^(\d)\1\1(\d)(\d)\2\3$/.test(b) && b[3] !== b[4] && b[0] !== b[3] && b[0] !== b[4] },
  // окончание ABAB и после кода только две цифры — 977 455 45 45
  { name: "ABAB из двух цифр", example: "977 455 45 45", from: 13000, to: 15000, test: (b) => /(\d)(?!\1)(\d)\1\2$/.test(b) && new Set(b).size === 2 },
  // повтор тройки — 901 332 33 23, 901 343 34 33
  { name: "повтор тройки", example: "901 332 33 23", from: 7500, to: 9000, test: (b) => b[0] === b[3] && b[1] === b[4] && b[2] === b[5] && b[3] === b[6] && new Set(b).size === 2 },
  // зеркальное окончание ABBA — 967 228 25 52, 968 688 75 57
  { name: "окончание ABBA", example: "967 228 25 52", from: 3000, to: 3000, test: (b) => /(\d)(?!\1)(\d)\2\1$/.test(b) && new Set(b).size >= 3 && !/(\d)\1\1/.test(b) },
  // ровно четыре одинаковых в середине — 969 233 33 20
  { name: "****AAAA**", example: "969 233 33 20", from: 6500, to: 6500, test: (b) => /^(\d)(\d)\2\2\2(\d)/.test(b) && b[0] !== b[1] && b[5] !== b[1] },
];

export function patternPrice(id: string): { from: number; to: number } | null {
  const b = id.slice(3);
  const p = PATTERN_PRICES.find((x) => x.test(b));
  return p ? { from: p.from, to: p.to } : null;
}

/** Цена в диапазоне с шагом 500 ₽ — разная у разных номеров, чтобы список не выглядел «под копирку» */
function spread(n: Pick<PhoneNumber, "id" | "beauty_score">, from: number, to: number): number {
  if (to <= from) return from;
  const t = Math.min(1, Math.max(0, 0.4 * (n.beauty_score / 100) + 0.6 * seed(n.id)));
  return Math.round((from + (to - from) * t) / 500) * 500;
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
  if (rule && rule.price_from && isFiveMiddle(n.id)) {
    return { kind: "fixed", price: settings.five_mid_price || 3500, old: null };
  }
  if (rule && rule.price_from && isFiveStart(n.id)) {
    const from = settings.five_start_from || 10000;
    return { kind: "fixed", price: spread(n, from, Math.max(from, settings.five_start_to || 15000)), old: null };
  }
  const pp = rule && rule.price_from ? patternPrice(n.id) : null;
  if (pp) return { kind: "fixed", price: spread(n, pp.from, pp.to), old: null };
  if (rule && rule.price_from && isBudgetPattern(n.id)) {
    const from = settings.budget_price_from || 5000;
    return { kind: "fixed", price: spread(n, from, Math.max(from, settings.budget_price_to || 7000)), old: null };
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
