import { revalidateTag } from "next/cache";
import { runAutoBundles } from "@/lib/auto";
import { CATALOG_TAG, computeRecommended, moscowDay } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Раз в сутки: пары/тройки + готовая подборка «Рекомендуем» на день (300 номеров = 10 страниц),
 * чтобы главная открывалась мгновенно. ?only=feed — только подборка.
 * Vercel Cron присылает Authorization: Bearer CRON_SECRET; можно вызвать и вручную тем же ключом.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const key = url.searchParams.get("key");
  if (!secret || (req.headers.get("authorization") !== `Bearer ${secret}` && key !== secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const out: Record<string, unknown> = { ok: true };
    if (url.searchParams.get("only") !== "feed") Object.assign(out, await runAutoBundles());
    const day = moscowDay();
    const r = await computeRecommended(1, 300, day, "mix");
    const db = serviceClient();
    const { data } = await db.from("settings").select("data").eq("id", 1).maybeSingle();
    const cur = (data?.data as Record<string, unknown>) ?? {};
    await db.from("settings").upsert({ id: 1, data: { ...cur, feed: { day, total: r.total, ids: r.items.map((n) => n.id) } } });
    out.feed = r.items.length;
    revalidateTag(CATALOG_TAG, "max");
    return Response.json(out);
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
