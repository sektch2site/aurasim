import type { NextRequest } from "next/server";
import { searchCatalog } from "@/lib/data";
import type { CatalogQuery, Operator } from "@/lib/types";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = p.get(k);
    return v && !Number.isNaN(Number(v)) ? Number(v) : undefined;
  };
  const q: CatalogQuery = {
    code: p.get("code") ?? undefined,
    digits: p.get("d") ?? undefined,
    q: p.get("q") ?? undefined,
    mask: p.get("mask") ?? undefined,
    operators: (p.get("ops")?.split(",").filter(Boolean) as Operator[]) ?? undefined,
    tariffMin: num("tmin"),
    tariffMax: num("tmax"),
    region: p.get("region") ?? undefined,
    withPrice: p.get("priced") === "1",
    discount: p.get("discount") === "1",
    priceMin: num("pmin"),
    priceMax: num("pmax"),
    sort: (p.get("sort") as CatalogQuery["sort"]) ?? "mix",
    page: num("page") ?? 1,
    pageSize: num("size") ?? 40,
    ids: p.get("ids")?.split(",").filter(Boolean),
  };
  try {
    const res = await searchCatalog(q);
    return Response.json(res, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
