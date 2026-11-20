import { revalidateTag } from "next/cache";
import { runAutoBundles } from "@/lib/auto";
import { CATALOG_TAG } from "@/lib/data";

export const maxDuration = 60;

/** Vercel Cron присылает Authorization: Bearer CRON_SECRET; можно вызвать и вручную тем же ключом */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || (req.headers.get("authorization") !== `Bearer ${secret}` && key !== secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAutoBundles();
    revalidateTag(CATALOG_TAG, "max");
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
