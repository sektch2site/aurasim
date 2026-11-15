import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/data";
import { priceFields } from "@/lib/partner";
import { serviceClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS, type PhoneNumber, type PriceRule, type Settings } from "@/lib/types";

export const maxDuration = 60;

/**
 * Пересчёт site_price (цена для сортировки/фильтра) и скрытие «проходных» номеров.
 * Идёт кусками по id: ?after=<последний id>&pages=N. Возвращает next — с чего продолжать.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get("authorization") !== `Bearer ${secret}` && url.searchParams.get("key") !== secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  const [{ data: rules }, { data: st }, { data: feat }] = await Promise.all([
    db.from("price_rules").select("*"),
    db.from("settings").select("data").eq("id", 1).maybeSingle(),
    db.from("featured").select("number_id"),
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...((st?.data as Partial<Settings>) ?? {}) } as Settings;
  const keep = new Set(((feat as { number_id: string }[]) ?? []).map((f) => f.number_id));
  let after = url.searchParams.get("after") ?? "";
  const pages = Math.min(40, Number(url.searchParams.get("pages") ?? 20));
  let done = 0;
  let hidden = 0;
  const t0 = Date.now();
  for (let i = 0; i < pages && Date.now() - t0 < 45000; i++) {
    const { data, error } = await db.from("numbers").select("*").gt("id", after).order("id").limit(1000);
    if (error) return Response.json({ error: error.message, after }, { status: 500 });
    const rows = (data as (PhoneNumber & { vip?: boolean; site_price?: number | null })[]) ?? [];
    if (!rows.length) {
      after = "";
      break;
    }
    const out = rows.map((r) => {
      const pf = priceFields(r, (rules as PriceRule[]) ?? [], settings);
      const hide = r.source === "partner" && r.is_active && pf.junk && !keep.has(r.id);
      if (hide) hidden++;
      const { vip: _vip, ...rest } = r;
      void _vip;
      return { ...rest, site_price: pf.site_price, is_active: hide ? false : r.is_active };
    });
    const { error: e2 } = await db.from("numbers").upsert(out, { onConflict: "id" });
    if (e2) return Response.json({ error: e2.message, after }, { status: 500 });
    done += rows.length;
    after = rows[rows.length - 1].id;
    if (rows.length < 1000) {
      after = "";
      break;
    }
  }
  if (!after) revalidateTag(CATALOG_TAG, "max");
  return Response.json({ ok: true, done, hidden, next: after || null });
}
