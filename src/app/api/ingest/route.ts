import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/data";
import { partnerToRow, type PartnerItem } from "@/lib/partner";
import { DEFAULT_SETTINGS, type PriceRule, type Settings } from "@/lib/types";
import { serviceClient } from "@/lib/supabase/admin";

/**
 * Приём номеров от раннера, который работает во вкладке кабинета ac-partner.ru
 * (во встроенном браузере Claude на компьютере, где выполнен вход).
 *   start  → { runId }
 *   batch  → { runId, items }       — upsert номеров
 *   finish → { runId, seen }        — снять с сайта всё, что не пришло (проданные / чужие брони)
 *   status → { status, message }    — например «нужен вход»
 */
export const maxDuration = 60;

const ORIGIN = "https://ac-partner.ru";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const body = (await req.json().catch(() => null)) as
    | { action: "start" }
    | { action: "batch"; runId: number; items: PartnerItem[] }
    | { action: "finish"; runId: number; seen: number; scanned?: number; partial?: boolean }
    | { action: "status"; status: string; message?: string; runId?: number }
    | null;
  if (!body) return json({ error: "bad json" }, 400);
  const db = serviceClient();
  const now = new Date().toISOString();

  switch (body.action) {
    case "start": {
      const { data, error } = await db.from("sync_runs").insert({}).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ runId: data.id });
    }
    case "batch": {
      const seenIds = new Set<string>();
      const [{ data: rules }, { data: st }] = await Promise.all([
        db.from("price_rules").select("*"),
        db.from("settings").select("data").eq("id", 1).maybeSingle(),
      ]);
      const settings = { ...DEFAULT_SETTINGS, ...((st?.data as Partial<Settings>) ?? {}) } as Settings;
      const rows = (body.items ?? [])
        .map((it) => partnerToRow(it, body.runId, now, (rules as PriceRule[]) ?? [], settings))
        .filter((r): r is NonNullable<typeof r> => !!r && !seenIds.has(r.id) && !!seenIds.add(r.id));
      if (!rows.length) return json({ count: 0 });
      const { error } = await db.from("numbers").upsert(rows, { onConflict: "id" });
      if (error) return json({ error: error.message }, 500);
      return json({ count: rows.length });
    }
    case "finish": {
      let removed = 0;
      // защита: если пришло подозрительно мало — ничего не снимаем
      if (body.seen >= 1000 && !body.partial) {
        const { count } = await db
          .from("numbers")
          .update({ is_active: false }, { count: "exact" })
          .eq("source", "partner")
          .eq("is_active", true)
          .neq("sync_run", body.runId);
        removed = count ?? 0;
      }
      const { count: added } = await db.from("numbers").select("id", { count: "exact", head: true }).gte("first_seen", (await runStart(body.runId)) ?? now);
      await db
        .from("sync_runs")
        .update({ finished_at: now, added: added ?? 0, updated: Math.max(0, body.seen - (added ?? 0)), removed, scanned: body.scanned ?? 0 })
        .eq("id", body.runId);
      await db.from("partner_session").upsert({ id: 1, status: "ok", message: `Синхронизировано: ${body.seen} номеров`, checked_at: now });
      revalidateTag(CATALOG_TAG, "max");
      return json({ ok: true, removed });
    }
    case "status": {
      await db.from("partner_session").upsert({ id: 1, status: body.status, message: body.message ?? null, checked_at: now });
      if (body.runId) await db.from("sync_runs").update({ finished_at: now, error: body.message ?? body.status }).eq("id", body.runId);
      return json({ ok: true });
    }
  }
  return json({ error: "unknown action" }, 400);
}

async function runStart(runId: number): Promise<string | null> {
  const { data } = await serviceClient().from("sync_runs").select("started_at").eq("id", runId).maybeSingle();
  return (data?.started_at as string) ?? null;
}
