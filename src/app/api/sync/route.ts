import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { CATALOG_TAG } from "@/lib/data";
import { hasSupabase } from "@/lib/supabase/env";
import { runSync } from "@/lib/sync";

export const maxDuration = 300;

/** Вызывается Vercel Cron раз в сутки (см. vercel.json) */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasSupabase) return Response.json({ error: "Supabase не подключён" }, { status: 500 });
  const res = await runSync();
  revalidateTag(CATALOG_TAG, "max");
  return Response.json(res, { status: res.error ? 500 : 200 });
}
