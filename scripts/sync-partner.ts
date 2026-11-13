/**
 * Синхронизация номеров из кабинета партнёра «Агентство Связи» (ac-partner.ru) в Supabase.
 *
 *   node --experimental-strip-types scripts/sync-partner.ts sync    — полная синхронизация по маскам
 *   node --experimental-strip-types scripts/sync-partner.ts check   — проверить/продлить сессию
 *
 * Переменные окружения: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, CRON_SECRET,
 * PARTNER_MASKS (необязательно, через запятую).
 * Cookie сессии берётся из таблицы partner_session (вставляется в админке сайта).
 */
import { createClient } from "@supabase/supabase-js";
import { analyzeBeauty } from "../src/lib/beauty.ts";

const BASE = "https://ac-partner.ru";
const PAGE = 150;
const CONCURRENCY = 4;

/** «Красивые» маски по умолчанию (~100–120 тыс. номеров) */
const DEFAULT_MASKS = [
  "******AAAA",
  "*****AAAA*",
  "****AAAA**",
  "***AAAA***",
  "*******AAA",
  "****ABABAB",
  "***ABAB***",
  "***ABBA***",
  "****ABBA**",
  "*****ABBA*",
  "******ABBA",
  "***ABC*ABC",
];

const OPERATORS: Record<number, string> = { 1: "beeline", 2: "megafon", 3: "mts", 5: "yota", 8: "t2", 17: "beeline" };

const env = (k: string, required = true) => {
  const v = process.env[k] ?? "";
  if (required && !v) throw new Error(`Не задана переменная ${k}`);
  return v;
};

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

class SessionExpired extends Error {}

interface PartnerTariff {
  name: string;
  costForSearch: number;
}
interface PartnerItem {
  number: string;
  operator: number;
  status: number;
  region?: { name?: string } | null;
  minCost?: number | string;
  price?: number | string;
  isCis?: boolean;
  tariffs?: PartnerTariff[];
}

async function getCookie(): Promise<string> {
  const { data, error } = await db.from("partner_session").select("cookie").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  const raw = (data?.cookie ?? "").trim();
  if (!raw) throw new SessionExpired("Cookie партнёрки не задан — вставьте его в админке сайта");
  return raw.includes("=") ? raw : `PHPSESSID=${raw}`;
}

async function setSession(status: string, message: string | null) {
  await db.from("partner_session").update({ status, message, checked_at: new Date().toISOString() }).eq("id", 1);
}

async function fetchPage(cookie: string, mask: string, offset: number, attempt = 1): Promise<{ list: PartnerItem[]; total: number }> {
  const body = new URLSearchParams({ "search[isFree]": "1", "search[number]": mask, "search[isLast]": "1", tab: "all" });
  try {
    const r = await fetch(`${BASE}/number/${offset}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: `${BASE}/number`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      },
      body,
    });
    if (r.status >= 300 && r.status < 400) throw new SessionExpired("Сессия партнёрки истекла — войдите заново и обновите cookie в админке");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    let json: { list?: PartnerItem[]; total?: string | number };
    try {
      json = JSON.parse(text);
    } catch {
      throw new SessionExpired("Партнёрка вернула не JSON — вероятно, сессия истекла");
    }
    return { list: json.list ?? [], total: Number(json.total ?? 0) };
  } catch (e) {
    if (e instanceof SessionExpired || attempt >= 3) throw e;
    await new Promise((res) => setTimeout(res, 1500 * attempt));
    return fetchPage(cookie, mask, offset, attempt + 1);
  }
}

function toRow(it: PartnerItem, runId: number, now: string) {
  const id = it.number.replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(id)) return null;
  const minCost = Number(it.minCost) || null;
  const tariff = it.tariffs?.find((t) => Number(t.costForSearch) === minCost) ?? it.tariffs?.[0];
  const b = analyzeBeauty(id);
  return {
    id,
    operator: OPERATORS[it.operator] ?? "other",
    partner_op: it.operator,
    region: it.region?.name ?? null,
    tariff_name: tariff?.name?.replace(/&infin;/g, "∞") ?? null,
    tariff_price: minCost,
    partner_price: Number(it.price) > 0 ? Number(it.price) : null,
    is_cis: it.isCis ?? null,
    beauty_score: b.score,
    beauty_mask: b.mask,
    tags: b.tags,
    is_active: true,
    source: "partner",
    last_seen: now,
    sync_run: runId,
  };
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function revalidate() {
  const site = env("SITE_URL", false);
  const secret = env("CRON_SECRET", false);
  if (!site || !secret) return;
  await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } }).catch(() => {});
}

async function check() {
  try {
    const cookie = await getCookie();
    const { total } = await fetchPage(cookie, "******AAAA", 0);
    await setSession("ok", `Сессия активна, номеров по маске ******AAAA: ${total}`);
    console.log("OK", total);
  } catch (e) {
    const expired = e instanceof SessionExpired;
    await setSession(expired ? "expired" : "error", (e as Error).message);
    console.error((e as Error).message);
    process.exitCode = expired ? 0 : 1;
  }
}

async function sync() {
  const masks = (env("PARTNER_MASKS", false) || DEFAULT_MASKS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { data: run, error: runErr } = await db.from("sync_runs").insert({}).select("id").single();
  if (runErr) throw new Error(runErr.message);
  const runId = run.id as number;
  const now = new Date().toISOString();
  const seen = new Set<string>();
  let buffer: NonNullable<ReturnType<typeof toRow>>[] = [];
  let scanned = 0;

  const flush = async () => {
    if (!buffer.length) return;
    const rows = buffer;
    buffer = [];
    const { error } = await db.from("numbers").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`Supabase: ${error.message}`);
  };

  try {
    const cookie = await getCookie();
    // считаем, сколько уже было, чтобы потом понять «новые»
    const { count: before } = await db.from("numbers").select("id", { count: "exact", head: true }).eq("source", "partner");

    for (const mask of masks) {
      const first = await fetchPage(cookie, mask, 0);
      const offsets: number[] = [];
      for (let off = PAGE; off < first.total; off += PAGE) offsets.push(off);
      const handle = async (list: PartnerItem[]) => {
        for (const it of list) {
          if (it.status !== 0) continue; // только свободные
          const row = toRow(it, runId, now);
          if (!row || seen.has(row.id)) continue;
          seen.add(row.id);
          buffer.push(row);
        }
        scanned += list.length;
        if (buffer.length >= 1000) await flush();
      };
      await handle(first.list);
      await pool(offsets, CONCURRENCY, async (off) => handle((await fetchPage(cookie, mask, off)).list));
      console.log(`${mask}: ${first.total} → уникальных всего ${seen.size}`);
    }
    await flush();

    let removed = 0;
    if (seen.size >= 1000) {
      const { count } = await db
        .from("numbers")
        .update({ is_active: false }, { count: "exact" })
        .eq("source", "partner")
        .eq("is_active", true)
        .neq("sync_run", runId);
      removed = count ?? 0;
    }
    const { count: after } = await db.from("numbers").select("id", { count: "exact", head: true }).eq("source", "partner");
    const added = Math.max(0, (after ?? 0) - (before ?? 0));
    await db
      .from("sync_runs")
      .update({ finished_at: new Date().toISOString(), added, updated: seen.size - added, removed, scanned })
      .eq("id", runId);
    await setSession("ok", `Синхронизировано: ${seen.size} номеров`);
    await revalidate();
    console.log({ unique: seen.size, added, removed, scanned });
  } catch (e) {
    const msg = (e as Error).message;
    await flush().catch(() => {});
    await db.from("sync_runs").update({ finished_at: new Date().toISOString(), error: msg, scanned }).eq("id", runId);
    if (e instanceof SessionExpired) await setSession("expired", msg);
    console.error(msg);
    process.exitCode = 1;
  }
}

const mode = process.argv[2] ?? "sync";
await (mode === "check" ? check() : sync());
