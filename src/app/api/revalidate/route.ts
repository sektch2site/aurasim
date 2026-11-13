import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/data";

/** Вызывается скриптом синхронизации после обновления номеров */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(CATALOG_TAG, "max");
  return Response.json({ ok: true });
}
