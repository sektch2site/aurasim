import { cacheLife, cacheTag } from "next/cache";
import { analyzeBeauty } from "./beauty";
import { digitsToLike, matchLike, matchMask, maskToPgRegex, normalizeMask, POPULAR_MASKS } from "./mask";
import { MOCK_BUNDLES, MOCK_FEATURED, MOCK_RULES, MOCK_TARIFFS, mockNumbers } from "./mock";
import { findRule, isVipPattern, priceSortValue, resolvePrice } from "./pricing";
import { hasSupabase } from "./supabase/env";
import { publicClient } from "./supabase/public";
import {
  DEFAULT_SETTINGS,
  type Bundle,
  type CatalogItem,
  type CatalogQuery,
  type CatalogResult,
  type PhoneNumber,
  type PriceRule,
  type Settings,
  type Tariff,
} from "./types";

export const CATALOG_TAG = "catalog";

/* ---------- справочники ---------- */

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  if (!hasSupabase) return DEFAULT_SETTINGS;
  const { data } = await publicClient().from("settings").select("data").eq("id", 1).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.data as Partial<Settings>) ?? {}) };
}

export async function getRules(): Promise<PriceRule[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  if (!hasSupabase) return MOCK_RULES;
  const { data } = await publicClient().from("price_rules").select("*");
  return (data as PriceRule[]) ?? [];
}

export async function getTariffs(): Promise<Tariff[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  if (!hasSupabase) return MOCK_TARIFFS;
  const { data } = await publicClient().from("tariffs").select("*").order("position");
  return (data as Tariff[]) ?? [];
}

/* ---------- обогащение ценой ---------- */

function enrich(n: PhoneNumber, rules: PriceRule[], settings: Settings): CatalogItem {
  const rule = findRule(n, rules);
  // подсветку считаем на лету — правила подсветки меняются сразу для всех номеров
  return { ...n, beauty_mask: n.mask_override && /^[01]{10}$/.test(n.mask_override) ? n.mask_override : analyzeBeauty(n.id).mask, display_groups: settings.display_formats?.[n.id] ?? null, price: resolvePrice(n, rules, settings), tariff_note: rule?.tariff_note ?? null };
}

async function byIds(ids: string[]): Promise<PhoneNumber[]> {
  if (!ids.length) return [];
  if (!hasSupabase) {
    const all = new Map(mockNumbers().map((n) => [n.id, n]));
    return ids.map((id) => all.get(id)).filter(Boolean) as PhoneNumber[];
  }
  const { data } = await publicClient().from("numbers").select("*").in("id", ids);
  const map = new Map(((data as PhoneNumber[]) ?? []).map((n) => [n.id, n]));
  return ids.map((id) => map.get(id)).filter(Boolean) as PhoneNumber[];
}

/* ---------- подборки ---------- */

/** Ручная подборка из админки */
export async function getFeatured(): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  const [rules, settings] = await Promise.all([getRules(), getSettings()]);
  let ids: string[];
  if (!hasSupabase) ids = MOCK_FEATURED;
  else {
    const { data } = await publicClient().from("featured").select("number_id").order("position");
    ids = ((data as { number_id: string }[]) ?? []).map((r) => r.number_id);
  }
  const nums = await byIds(ids);
  return nums.filter((n) => n.is_active).map((n) => enrich(n, rules, settings));
}

/** Автоподборка: самые красивые активные номера, кроме ручной подборки */
export async function getAutoPicks(limit = 24): Promise<CatalogItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  const [rules, settings, featured] = await Promise.all([getRules(), getSettings(), getFeatured()]);
  const skip = new Set(featured.map((f) => f.id));
  let list: PhoneNumber[];
  if (!hasSupabase) {
    list = [...mockNumbers()].sort((a, b) => b.beauty_score - a.beauty_score);
  } else {
    const { data } = await publicClient()
      .from("numbers")
      .select("*")
      .eq("is_active", true)
      .order("beauty_score", { ascending: false })
      .limit(limit + skip.size + 20);
    list = (data as PhoneNumber[]) ?? [];
  }
  // разнообразие: не больше 3 номеров с одинаковыми последними 4 цифрами-паттерном
  const seenTail = new Map<string, number>();
  const out: CatalogItem[] = [];
  for (const n of list) {
    if (skip.has(n.id) || !n.is_active) continue;
    const key = n.tags.slice(0, 2).join("|") + n.id.slice(-3);
    const c = seenTail.get(key) ?? 0;
    if (c >= 2) continue;
    seenTail.set(key, c + 1);
    out.push(enrich(n, rules, settings));
    if (out.length >= limit) break;
  }
  return out;
}

export interface BundleView extends Bundle {
  items: CatalogItem[];
}

export async function getBundles(): Promise<BundleView[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  const [rules, settings] = await Promise.all([getRules(), getSettings()]);
  let bundles: Bundle[];
  if (!hasSupabase) bundles = MOCK_BUNDLES;
  else {
    const { data } = await publicClient().from("bundles").select("*").eq("is_active", true).order("position");
    bundles = (data as Bundle[]) ?? [];
  }
  const all = await byIds([...new Set(bundles.flatMap((b) => b.numbers))]);
  const map = new Map(all.map((n) => [n.id, n]));
  return bundles
    .filter((b) => b.is_active)
    .map((b) => ({
      ...b,
      items: b.numbers.map((id) => map.get(id)).filter(Boolean).map((n) => enrich(n!, rules, settings)),
    }))
    .filter((b) => b.items.length >= 2);
}

/* ---------- поиск ---------- */

export async function searchCatalog(q: CatalogQuery): Promise<CatalogResult> {
  const [rules, settings] = await Promise.all([getRules(), getSettings()]);
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, q.pageSize ?? 40);
  if (q.ids?.length) {
    const ids = q.ids.map((x) => x.replace(/\D/g, "").slice(-10)).filter((x) => x.length === 10).slice(0, 200);
    const items = (await byIds(ids)).filter((n) => n.is_active).map((n) => enrich(n, rules, settings));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }
  const like = digitsToLike(q.code, q.digits);
  const free = q.q?.replace(/\D/g, "") || undefined;

  if (!hasSupabase) {
    let list = mockNumbers().filter((n) => n.is_active);
    if (like) list = list.filter((n) => matchLike(n.id, like));
    if (q.mask) list = list.filter((n) => matchMask(n.id, q.mask!));
    if (free) list = list.filter((n) => n.id.includes(free.slice(-10)));
    if (q.operators?.length) list = list.filter((n) => q.operators!.includes(n.operator));
    if (q.tariffMin != null) list = list.filter((n) => (n.tariff_price ?? -1) >= q.tariffMin!);
    if (q.tariffMax != null) list = list.filter((n) => n.tariff_price != null && n.tariff_price <= q.tariffMax!);
    if (q.region) list = list.filter((n) => n.region === q.region);
    let items = list.map((n) => enrich(n, rules, settings));
    if (q.withPrice) items = items.filter((i) => i.price.kind === "fixed");
    if (q.discount) items = items.filter((i) => i.price.kind === "fixed" && (i.price.old ?? 0) > i.price.price);
    const sort = q.sort ?? "mix";
    if (sort === "price_asc") items.sort((a, b) => priceSortValue(a.price) - priceSortValue(b.price));
    else if (sort === "price_desc")
      items.sort((a, b) => (b.price.kind === "request" ? -1 : priceSortValue(b.price)) - (a.price.kind === "request" ? -1 : priceSortValue(a.price)));
    else items.sort((a, b) => b.beauty_score - a.beauty_score || a.id.localeCompare(b.id));
    if (sort === "mix") {
      const ruled = (i: PhoneNumber) => !!findRule(i, rules)?.price_from;
      const cheap = items.filter((i) => (i.price_override != null ? i.price_override <= MIX_SPLIT : i.partner_price == null && !isVipPattern(i.id) && ruled(i)));
      const premium = items.filter((i) => (i.price_override != null ? i.price_override > MIX_SPLIT : i.partner_price != null || isVipPattern(i.id)));
      const request = items.filter((i) => i.price_override == null && i.partner_price == null && !isVipPattern(i.id) && !ruled(i));
      const plan = planMix((page - 1) * pageSize, pageSize, cheap.length, premium.length, request.length);
      const src = { A: cheap, B: premium, C: request };
      return { items: plan.map(([bk, i]) => src[bk][i]), total: items.length, page, pageSize };
    }
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
  }

  const base = {
    p_like: like,
    p_regex: q.mask && !POPULAR_MASKS.includes(normalizeMask(q.mask)) ? maskToPgRegex(q.mask) : null,
    p_mask_tag: q.mask && POPULAR_MASKS.includes(normalizeMask(q.mask)) ? normalizeMask(q.mask) : null,
    p_q: free ?? null,
    p_operators: q.operators?.length ? q.operators : null,
    p_tariff_min: q.tariffMin ?? null,
    p_tariff_max: q.tariffMax ?? null,
    p_region: q.region ?? null,
    p_with_price: Boolean(q.withPrice),
    p_discount: Boolean(q.discount),
    p_split: MIX_SPLIT,
    p_rule_ops: [...new Set(rules.filter((r) => r.price_from).map((r) => r.operator))],
  };
  const slice = async (sort: string, bucket: "cheap" | "premium" | "request" | null, offset: number, limit: number) => {
    if (limit <= 0) return { items: [] as CatalogItem[], total: -1 };
    const { data, error } = await publicClient().rpc("search_numbers", { ...base, p_sort: sort, p_bucket: bucket, p_limit: limit, p_offset: offset });
    if (error) throw new Error(error.message);
    const rows = (data as { row_data: PhoneNumber; total: number }[]) ?? [];
    let items = rows.map((r) => enrich(r.row_data, rules, settings));
    // разные буквы маски = разные цифры (в SQL не проверяется)
    if (q.mask) items = items.filter((i) => matchMask(i.id, q.mask!));
    return { items, total: rows.length ? Number(rows[0].total) : -1 };
  };

  let sort = q.sort ?? "mix";
  const offset = (page - 1) * pageSize;
  // своя маска (регулярка) тяжёлая — без смешанной выдачи, одним запросом
  if (sort === "mix" && base.p_regex) sort = "beauty";
  // «Рекомендуем» без фильтров — разнообразная подборка, меняется каждый день
  const plain = !like && !free && !q.mask && !q.operators?.length && q.tariffMin == null && q.tariffMax == null && !q.region && !q.withPrice && !q.discount;
  if (sort === "mix" && plain) return recommendedPage(page, pageSize, moscowDay());
  if (sort !== "mix") {
    const r = await slice(sort, null, offset, pageSize);
    return { items: r.items, total: Math.max(0, r.total), page, pageSize };
  }

  // Смешанная выдача: сначала 5 недорогих (до 30 000 ₽), дальше 3 недорогих на 1 дорогой,
  // номера без цены и без правила цены — в конце
  const buckets = ["cheap", "premium", "request"] as const;
  const totals = await Promise.all(buckets.map(async (bk) => Math.max(0, (await slice("beauty", bk, 0, 1)).total)));
  const plan = planMix(offset, pageSize, totals[0], totals[1], totals[2]);
  const idx = (k: "A" | "B" | "C") => plan.filter((x) => x[0] === k).map((x) => x[1]);
  const [ia, ib, ic] = [idx("A"), idx("B"), idx("C")];
  const [ra, rb, rc] = await Promise.all([
    ia.length ? slice("beauty", "cheap", ia[0], ia.length) : Promise.resolve({ items: [] as CatalogItem[], total: 0 }),
    ib.length ? slice("beauty", "premium", ib[0], ib.length) : Promise.resolve({ items: [] as CatalogItem[], total: 0 }),
    ic.length ? slice("beauty", "request", ic[0], ic.length) : Promise.resolve({ items: [] as CatalogItem[], total: 0 }),
  ]);
  const ptr = { A: 0, B: 0, C: 0 };
  const src = { A: ra.items, B: rb.items, C: rc.items };
  const items: CatalogItem[] = [];
  for (const [bk] of plan) {
    const it = src[bk][ptr[bk]++];
    if (it) items.push(it);
  }
  return { items, total: totals[0] + totals[1] + totals[2], page, pageSize };
}

const MIX_SPLIT = 30000;

/** Сегодняшняя дата по Москве — ключ ежедневной подборки */
function moscowDay(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const FEED_OPS = ["beeline", "megafon", "mts", "yota", "t2"] as const;

/**
 * «Рекомендуем»: каждый день новая выборка. На странице — номера всех операторов вперемешку
 * и разных ценовых категорий: на каждого оператора 4 недорогих (до 30 тыс.) и 2 дорогих.
 */
async function recommendedPage(page: number, pageSize: number, day: string): Promise<CatalogResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const [rules, settings] = await Promise.all([getRules(), getSettings()]);
  const perOp = Math.max(1, Math.ceil(pageSize / FEED_OPS.length));
  const kCheap = Math.ceil((perOp * 2) / 3);
  const kPrem = perOp - kCheap;
  const base = {
    p_like: null, p_regex: null, p_mask_tag: null, p_q: null, p_tariff_min: null, p_tariff_max: null, p_region: null,
    p_with_price: false, p_discount: false, p_split: MIX_SPLIT,
    p_rule_ops: [...new Set(rules.filter((r) => r.price_from).map((r) => r.operator))],
  };
  const slice = async (op: string, bucket: "cheap" | "premium", k: number, window: number) => {
    const start = hashStr(`${day}:${op}:${bucket}`) % window;
    const off = start + (page - 1) * k;
    const call = (o: number) =>
      publicClient().rpc("search_numbers", { ...base, p_operators: [op], p_sort: "beauty", p_bucket: bucket, p_limit: k, p_offset: o });
    let { data } = await call(off);
    let rows = (data as { row_data: PhoneNumber; total: number }[]) ?? [];
    if (!rows.length && off > 0) {
      // у оператора меньше номеров, чем окно — берём с начала
      ({ data } = await call((page - 1) * k));
      rows = (data as { row_data: PhoneNumber; total: number }[]) ?? [];
    }
    return { items: rows.map((r) => enrich(r.row_data, rules, settings)), total: rows.length ? Number(rows[0].total) : 0 };
  };
  const res = await Promise.all(
    FEED_OPS.map(async (op) => {
      // только самые красивые: узкое окно сверху по красоте, без дешёвых «проходных» комбинаций
      const [c0, p] = await Promise.all([slice(op, "cheap", kCheap * 3, 400), slice(op, "premium", kPrem, 150)]);
      const c = { ...c0, items: c0.items.filter((x) => x.price.kind !== "fixed" || x.price.price >= 6000).slice(0, kCheap) };
      // у оператора: недорогой, недорогой, дорогой, …
      const q: CatalogItem[] = [];
      const ci = [...c.items];
      const pi = [...p.items];
      while (ci.length || pi.length) {
        if (ci.length) q.push(ci.shift()!);
        if (ci.length) q.push(ci.shift()!);
        if (pi.length) q.push(pi.shift()!);
      }
      return { q, total: c.total + p.total };
    }),
  );
  // операторы по кругу, порядок операторов свой на каждый день
  const order = [...res].sort((a, b) => hashStr(day + a.q[0]?.id) - hashStr(day + b.q[0]?.id));
  const items: CatalogItem[] = [];
  for (let r = 0; items.length < pageSize && order.some((o) => o.q.length); r++) {
    for (const o of order) if (o.q.length && items.length < pageSize) items.push(o.q.shift()!);
  }
  const total = res.reduce((a, b) => a + b.total, 0);
  return { items, total, page, pageSize };
}

/** Раскладка смешанной выдачи: первые 5 — недорогие (A), дальше A,A,A,B…; без цены (C) — после них */
function planMix(offset: number, size: number, totA: number, totB: number, totC = 0): ["A" | "B" | "C", number][] {
  const out: ["A" | "B" | "C", number][] = [];
  const used = { A: 0, B: 0, C: 0 };
  const tot = { A: totA, B: totB, C: totC };
  for (let i = 0; i < offset + size; i++) {
    // приоритет недорогим: первые 5 — недорогие, дальше 3 недорогих на 1 дорогой
    const want: "A" | "B" = i < 5 ? "A" : (i - 5) % 4 < 3 ? "A" : "B";
    const order: ("A" | "B" | "C")[] = want === "A" ? ["A", "B", "C"] : ["B", "A", "C"];
    const pick = order.find((k) => used[k] < tot[k]);
    if (!pick) break;
    if (i >= offset) out.push([pick, used[pick]]);
    used[pick]++;
  }
  return out;
}

/** Первая страница «Все номера» на главной (кешируется) */
export async function getTopNumbers(pageSize = 30): Promise<CatalogResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  return searchCatalog({ sort: "mix", page: 1, pageSize });
}

export async function getRegions(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  if (!hasSupabase) return [...new Set(mockNumbers().map((n) => n.region).filter(Boolean) as string[])].sort();
  const { data } = await publicClient().from("numbers").select("region").eq("is_active", true).limit(5000);
  return [...new Set(((data as { region: string | null }[]) ?? []).map((r) => r.region).filter(Boolean) as string[])].sort();
}

export async function getStats(): Promise<{ total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  if (!hasSupabase) return { total: mockNumbers().length };
  const { count } = await publicClient().from("numbers").select("id", { count: "estimated", head: true }).eq("is_active", true);
  return { total: count ?? 0 };
}
