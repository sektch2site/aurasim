import { analyzeBeauty } from "./beauty";

/** Запись номера из кабинета «Агентство Связи» (урезанная раннером) */
export interface PartnerItem {
  number: string;
  operator: number;
  status?: number;
  region?: { name?: string } | null;
  minCost?: number | string | null;
  price?: number | string | null;
  isCis?: boolean;
  tariffs?: { name: string; costForSearch: number | string }[];
}

/** Коды операторов в кабинете: 1 Билайн, 2 МегаФон, 3 МТС, 5 Yota, 8 T2, 17 Билайн (D) */
const OPERATORS: Record<number, string> = { 1: "beeline", 2: "megafon", 3: "mts", 5: "yota", 8: "t2", 17: "beeline" };

export function partnerToRow(it: PartnerItem, runId: number, now: string) {
  const id = String(it.number ?? "").replace(/\D/g, "").slice(-10);
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
