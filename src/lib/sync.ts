import "server-only";
import { analyzeBeauty } from "./beauty";
import { fetchPartnerNumbers } from "./source/agentstvo";
import { serviceClient } from "./supabase/admin";

export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  error?: string;
}

/**
 * Синхронизация с партнёркой:
 *  — новые номера добавляются, существующие обновляются (тариф, цена партнёрки);
 *  — номера, которых больше нет в партнёрке, скрываются (is_active = false).
 * Ручные поля (price_override, price_old) и ручные номера не трогаются.
 */
export async function runSync(): Promise<SyncResult> {
  const db = serviceClient();
  const { data: run } = await db.from("sync_runs").insert({}).select("id").single();
  const runId = run?.id as number;
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  try {
    for await (const batch of fetchPartnerNumbers()) {
      const rows = batch.filter((n) => /^\d{10}$/.test(n.id));
      const ids = rows.map((r) => r.id);
      const { data: existing } = await db.from("numbers").select("id").in("id", ids);
      const known = new Set((existing ?? []).map((e) => e.id as string));
      const payload = rows.map((n) => {
        const b = analyzeBeauty(n.id);
        return {
          ...n,
          beauty_score: b.score,
          beauty_mask: b.mask,
          tags: b.tags,
          is_active: true,
          source: "partner",
          last_seen: now,
          sync_run: runId,
        };
      });
      const { error } = await db.from("numbers").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
      added += rows.filter((r) => !known.has(r.id)).length;
      updated += rows.filter((r) => known.has(r.id)).length;
    }
    if (added + updated === 0) throw new Error("Партнёрка вернула 0 номеров — снимать ничего не стал");
    // всё из партнёрки, что не пришло в этот раз, — скрываем
    const { count } = await db
      .from("numbers")
      .update({ is_active: false }, { count: "exact" })
      .eq("source", "partner")
      .eq("is_active", true)
      .neq("sync_run", runId);
    const res = { added, updated, removed: count ?? 0 };
    await db.from("sync_runs").update({ ...res, finished_at: new Date().toISOString() }).eq("id", runId);
    return res;
  } catch (e) {
    const error = (e as Error).message;
    await db.from("sync_runs").update({ error, added, updated, finished_at: new Date().toISOString() }).eq("id", runId);
    return { added, updated, removed: 0, error };
  }
}
