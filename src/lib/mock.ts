/**
 * Тестовые данные — используются, пока не подключён Supabase.
 * Включают реальные номера из канала Aura sim и из скринов партнёрки.
 */
import { analyzeBeauty } from "./beauty";
import type { Bundle, Operator, PhoneNumber, PriceRule, Tariff } from "./types";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const REGIONS = ["Москва", "Москва", "Москва", "Санкт-Петербург", "Казань", "Ростов-на-Дону", "Краснодар", "Екатеринбург", "Новосибирск", "Ставрополь"];
const CODES: Record<Operator, string[]> = {
  beeline: ["903", "905", "906", "909", "960", "961", "962", "963", "964", "965", "966", "967", "968", "969", "980", "983", "986", "991", "992", "993", "995", "996", "999"],
  megafon: ["920", "921", "925", "926", "927", "929", "930", "931", "932", "933", "937", "938", "939", "977", "999"],
  mts: ["910", "911", "912", "913", "914", "915", "916", "917", "918", "919", "978", "981", "985", "987", "988", "989"],
  yota: ["958", "999", "991"],
  t2: ["900", "901", "902", "904", "908", "950", "951", "952", "953", "958", "977", "995"],
  other: ["934", "936", "958"],
};
const TARIFFS: Record<Operator, [string, number][]> = {
  beeline: [["Близкие люди 2", 650], ["Анлим", 950], ["VIP", 2500]],
  megafon: [["Минимум", 500], ["Без переплат", 900], ["Премиум", 3000]],
  mts: [["Мой МТС", 650], ["Анлим", 950], ["Премиум", 2500]],
  yota: [["Базовый", 450], ["Расширенный", 900]],
  t2: [["Мой онлайн", 550], ["Black", 1500]],
  other: [["Базовый", 500]],
};

function pick<T>(r: () => number, a: T[]): T {
  return a[Math.floor(r() * a.length)];
}

function patternBody(r: () => number): string {
  const d = () => String(Math.floor(r() * 10));
  const a = d();
  let b = d();
  while (b === a) b = d();
  const c = d();
  const kinds = [
    () => d() + d() + d() + a + a + a + a, // ***AAAA
    () => d() + d() + a + a + a + a + a,
    () => a + a + a + d() + d() + d() + d(),
    () => d() + d() + d() + a + b + a + b,
    () => d() + a + b + a + b + a + b,
    () => d() + d() + d() + a + a + b + b,
    () => a + a + a + b + b + b + d(),
    () => d() + d() + a + b + b + a + c,
    () => a + b + c + c + b + a + d(),
    () => d() + a + a + a + b + a + a,
    () => d() + d() + d() + d() + "000",
    () => a + "00" + a + "00" + d(),
    () => {
      const s = Math.floor(r() * 4);
      return String(s) + String(s + 1) + String(s + 2) + String(s + 3) + String(s + 4) + String(s + 5) + String(s + 6);
    },
    () => d() + d() + d() + d() + d() + d() + d(),
  ];
  return pick(r, kinds)();
}

interface Seed {
  id: string;
  op: Operator;
  region?: string;
  price?: number;
  old?: number;
}

/** Реальные номера из канала и партнёрки */
const REAL: Seed[] = [
  { id: "9610444004", op: "beeline", price: 10000 },
  { id: "9328888282", op: "megafon", price: 25000 },
  { id: "9099990025", op: "beeline", price: 30000, old: 80000 },
  { id: "9099990928", op: "beeline", price: 30000, old: 80000 },
  { id: "9091606060", op: "beeline" },
  { id: "9924444402", op: "beeline" },
  { id: "9770770099", op: "megafon" },
  { id: "9320003030", op: "megafon" },
  { id: "9303333320", op: "megafon" },
  { id: "9680666060", op: "beeline" },
  { id: "9666747474", op: "beeline" },
  { id: "9999009096", op: "beeline" },
  { id: "9777777115", op: "megafon" },
  { id: "9303339993", op: "megafon" },
  { id: "9309933393", op: "megafon" },
  { id: "9309339939", op: "megafon" },
  { id: "9652555552", op: "beeline", price: 125000 },
  { id: "9393422222", op: "beeline", region: "Казань", price: 125000 },
  { id: "9840004000", op: "beeline", price: 120000 },
  { id: "9966543210", op: "beeline", price: 120000 },
  { id: "9686543210", op: "beeline", price: 120000 },
  { id: "9672345678", op: "beeline", price: 120000 },
  { id: "9685977777", op: "beeline", price: 110000 },
  { id: "9689300000", op: "beeline", price: 110000 },
  { id: "9924444449", op: "beeline", price: 110000 },
  { id: "9954444448", op: "beeline", region: "Ростов-на-Дону", price: 110000 },
  { id: "9921111119", op: "beeline", region: "Ставрополь", price: 110000 },
  { id: "9954444449", op: "beeline", region: "Ростов-на-Дону", price: 110000 },
  { id: "9683900000", op: "beeline", price: 110000 },
  { id: "9672800000", op: "beeline", price: 110000 },
  { id: "9341111112", op: "beeline", region: "Нальчик", price: 110000 },
  { id: "9915555556", op: "beeline", price: 110000 },
  { id: "9691800000", op: "beeline", price: 110000 },
  { id: "9663700000", op: "beeline", price: 110000 },
  { id: "9861111113", op: "beeline", price: 110000 },
  { id: "9684177777", op: "beeline", price: 110000 },
  { id: "9671706688", op: "beeline" },
  { id: "9855550404", op: "megafon" },
];

let cache: PhoneNumber[] | null = null;

export function mockNumbers(): PhoneNumber[] {
  if (cache) return cache;
  const r = rng(70);
  const out = new Map<string, PhoneNumber>();
  const make = (s: Seed, tariff: [string, number] | null): PhoneNumber => {
    const b = analyzeBeauty(s.id);
    return {
      id: s.id,
      operator: s.op,
      region: s.region ?? "Москва",
      tariff_name: tariff?.[0] ?? null,
      tariff_price: tariff?.[1] ?? null,
      partner_price: s.price ?? null,
      price_override: null,
      price_old: s.old ?? null,
      beauty_score: b.score,
      beauty_mask: b.mask,
      tags: b.tags,
      is_active: true,
      source: "partner",
    };
  };
  for (const s of REAL) out.set(s.id, make(s, s.price ? null : pick(r, TARIFFS[s.op])));

  const ops: Operator[] = ["beeline", "beeline", "beeline", "megafon", "megafon", "mts", "mts", "yota", "t2", "t2"];
  while (out.size < 2400) {
    const op = pick(r, ops);
    const id = pick(r, CODES[op]) + patternBody(r);
    if (out.has(id)) continue;
    const beauty = analyzeBeauty(id).score;
    const priced = r() < 0.35;
    const price = priced ? Math.max(3000, Math.round((beauty * beauty * 9 + 3000 + r() * 4000) / 500) * 500) : undefined;
    out.set(id, make({ id, op, region: pick(r, REGIONS), price }, priced ? null : pick(r, TARIFFS[op])));
  }
  cache = [...out.values()];
  return cache;
}

export const MOCK_RULES: PriceRule[] = [
  ...(["beeline", "megafon", "mts", "yota", "t2", "other"] as const).map((op) => ({ id: `r-${op}`, operator: op, tariff_max: null, price_from: 13000, price_to: 17000, tariff_note: null })),
];

export const MOCK_FEATURED: string[] = [
  "9610444004", "9328888282", "9099990025", "9099990928", "9091606060", "9924444402",
  "9770770099", "9320003030", "9303333320", "9680666060", "9666747474", "9999009096", "9777777115",
];

export const MOCK_BUNDLES: Bundle[] = [
  { id: "b1", kind: "trio", title: "Интересная тройка", numbers: ["9303339993", "9309933393", "9309339939"], price: 15000, price_old: null, is_active: true, position: 0 },
  { id: "b2", kind: "pair", title: "Пара для двоих", numbers: ["9099990025", "9099990928"], price: 50000, price_old: 160000, is_active: true, position: 1 },
  { id: "b3", kind: "pair", title: "Зеркальная пара", numbers: ["9966543210", "9686543210"], price: 220000, price_old: null, is_active: true, position: 2 },
];

export const MOCK_TARIFFS: Tariff[] = [
  { id: "t1", operator: "beeline", name: "Анлим", price: 950, description: "Безлимитный интернет, 1000 минут", position: 0 },
  { id: "t2", operator: "megafon", name: "Без переплат", price: 900, description: "Безлимит на соцсети и мессенджеры", position: 1 },
  { id: "t3", operator: "mts", name: "Мой МТС", price: 650, description: "30 ГБ, 600 минут", position: 2 },
];
