import "server-only";
import { resolvePrice } from "./pricing";
import { serviceClient } from "./supabase/admin";
import { DEFAULT_SETTINGS, type PhoneNumber, type PriceRule, type Settings } from "./types";

type DB = ReturnType<typeof serviceClient>;

const rnd = (n: number) => Math.floor(Math.random() * n);
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function load(db: DB) {
  const [{ data: rules }, { data: s }] = await Promise.all([
    db.from("price_rules").select("*"),
    db.from("settings").select("data").eq("id", 1).maybeSingle(),
  ]);
  const raw = ((s?.data as Partial<Settings>) ?? {}) as Partial<Settings>;
  return { rules: (rules as PriceRule[]) ?? [], raw, settings: { ...DEFAULT_SETTINGS, ...raw } as Settings };
}

/** Номера с ценой по правилу (не выкупные, без ручной цены, не «по запросу») — несколько случайных окон */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function candidates(db: DB, windows: number, extra?: (q: any) => any): Promise<PhoneNumber[]> {
  let cq = db
    .from("numbers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .is("partner_price", null)
    .is("price_override", null)
    .eq("vip", false);
  if (extra) cq = extra(cq);
  const { count } = await cq;
  const total = count ?? 0;
  const out: PhoneNumber[] = [];
  await Promise.all(
    Array.from({ length: windows }, async () => {
      const off = total > 1000 ? rnd(total - 1000) : 0;
      let q = db
        .from("numbers")
        .select("*")
        .eq("is_active", true)
        .is("partner_price", null)
        .is("price_override", null)
        .eq("vip", false)
        .order("id")
        .range(off, off + 999);
      if (extra) q = extra(q);
      const { data } = await q;
      out.push(...((data as PhoneNumber[]) ?? []));
    }),
  );
  return [...new Map(out.map((n) => [n.id, n])).values()];
}

/**
 * Раз в неделю: снимаем прошлые автоскидки и ставим новые на 50–100 номеров до 40 000 ₽
 * (скидка 20/30/40%, на сайте — зачёркнутая цена и бейдж).
 * Какие номера со скидкой — хранится в настройках (auto_sale_ids), ручные цены Ильи не трогаем.
 */
export async function runAutoSales() {
  const db = serviceClient();
  const { rules, raw, settings } = await load(db);

  // 1) снять прошлые автоскидки (только если цена всё ещё наша)
  const prev = raw.auto_sale_ids ?? {};
  let removed = 0;
  for (const [id, price] of Object.entries(prev)) {
    const { data } = await db.from("numbers").update({ price_override: null, price_old: null }).eq("id", id).eq("price_override", price).select("id");
    removed += data?.length ?? 0;
  }

  // 2) новые
  const want = 50 + rnd(51);
  const pool = (await candidates(db, 8))
    .map((n) => ({ n, p: resolvePrice(n, rules, settings) }))
    .filter((x) => x.p.kind === "fixed" && x.p.price >= 5000 && x.p.price <= 40000) as { n: PhoneNumber; p: { kind: "fixed"; price: number } }[];
  // больше шансов у красивых, но с разбросом
  pool.sort((a, b) => b.n.beauty_score + rnd(40) - (a.n.beauty_score + rnd(40)));
  const picked = shuffle(pool.slice(0, want * 3)).slice(0, want);
  const auto_sale_ids: Record<string, number> = {};
  for (const { n, p } of picked) {
    const d = [20, 30, 40][rnd(3)];
    const price = Math.max(1000, Math.round((p.price * (1 - d / 100)) / 500) * 500);
    const { error } = await db.from("numbers").update({ price_override: price, price_old: p.price }).eq("id", n.id).is("price_override", null);
    if (!error) auto_sale_ids[n.id] = price;
  }
  await db.from("settings").upsert({ id: 1, data: { ...raw, auto_sale_ids } });
  return { removed, added: Object.keys(auto_sale_ids).length };
}

/**
 * Каждый день: пересобираем автоматические пары и тройки (position >= 1000; ручные Ильи не трогаем).
 * Близнецы — одинаковые 7 цифр после кода у разных кодов (903 777 12 12 / 905 777 12 12).
 * Соседи — отличаются только последней цифрой (969 233 33 25 / 969 233 33 26).
 */
export async function runAutoBundles() {
  const db = serviceClient();
  const { rules, settings } = await load(db);
  // соседние номера идут подряд по id — их дают случайные окна; близнецов ищем среди самых красивых
  const { data: top } = await db
    .from("numbers")
    .select("*")
    .eq("is_active", true)
    .is("partner_price", null)
    .is("price_override", null)
    .eq("vip", false)
    .order("beauty_score", { ascending: false })
    .range(0, 4999);
  const pool = [...new Map([...(await candidates(db, 10, (q) => q.gte("beauty_score", 40))), ...((top as PhoneNumber[]) ?? [])].map((n) => [n.id, n])).values()]
    .map((n) => ({ n, p: resolvePrice(n, rules, settings) }))
    .filter((x) => x.p.kind === "fixed") as { n: PhoneNumber; p: { kind: "fixed"; price: number } }[];

  const group = (key: (id: string) => string) => {
    const m = new Map<string, typeof pool>();
    for (const x of pool) {
      const k = key(x.n.id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(x);
    }
    return [...m.values()].filter((g) => g.length >= 2);
  };
  const twins = shuffle(group((id) => id.slice(3)));
  const neighbours = shuffle(group((id) => id.slice(0, 9)));

  type Draft = { kind: "pair" | "trio"; title: string; items: typeof pool };
  const drafts: Draft[] = [];
  const used = new Set<string>();
  const take = (g: typeof pool, k: number) => {
    const free = g.filter((x) => !used.has(x.n.id)).sort((a, b) => a.n.id.localeCompare(b.n.id));
    if (free.length < k) return null;
    const s = rnd(free.length - k + 1);
    const items = free.slice(s, s + k);
    items.forEach((x) => used.add(x.n.id));
    return items;
  };
  for (const [groups, title] of [
    [twins, "Одинаковые номера"],
    [neighbours, "Соседние номера"],
  ] as const) {
    let trios = 0;
    let pairs = 0;
    for (const g of groups) {
      if (trios < 4 && g.length >= 3) {
        const it = take(g, 3);
        if (it) {
          drafts.push({ kind: "trio", title, items: it });
          trios++;
          continue;
        }
      }
      if (pairs < 6) {
        const it = take(g, 2);
        if (it) {
          drafts.push({ kind: "pair", title, items: it });
          pairs++;
        }
      }
      if (trios >= 4 && pairs >= 6) break;
    }
  }

  await db.from("bundles").delete().gte("position", 1000);
  const rows = shuffle(drafts).map((d, i) => {
    const sum = d.items.reduce((a, x) => a + x.p.price, 0);
    return {
      kind: d.kind,
      title: d.title,
      numbers: d.items.map((x) => x.n.id),
      price: Math.round((sum * 0.9) / 500) * 500,
      price_old: sum,
      is_active: true,
      position: 1000 + i,
    };
  });
  if (rows.length) {
    const { error } = await db.from("bundles").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { pairs: rows.filter((r) => r.kind === "pair").length, trios: rows.filter((r) => r.kind === "trio").length };
}
