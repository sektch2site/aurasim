/**
 * Источник номеров — личный кабинет партнёра «Агентство Связи» (ac-partner.ru).
 *
 * ⚠️ Пока заглушка. Вход в ЛК — по телефону + SMS, поэтому нужен один из вариантов:
 *   1) публичный промо-сайт партнёра (раздел «Ваш промо-сайт» в приложении) — без входа;
 *   2) API-ключ от партнёрки;
 *   3) токен сессии из веб-версии ЛК (AC_SESSION_TOKEN), который продлевается при каждом запросе.
 * Формат ответа подставим, когда посмотрим реальные запросы в веб-версии.
 */
import type { Operator } from "../types";

export interface PartnerNumber {
  id: string; // 10 цифр
  operator: Operator;
  region: string | null;
  tariff_name: string | null;
  tariff_price: number | null;
  partner_price: number | null;
}

export function sourceConfigured(): boolean {
  return Boolean(process.env.AC_API_BASE && (process.env.AC_SESSION_TOKEN || process.env.AC_API_KEY));
}

const OP_MAP: Record<string, Operator> = {
  beeline: "beeline",
  билайн: "beeline",
  megafon: "megafon",
  мегафон: "megafon",
  mts: "mts",
  мтс: "mts",
  yota: "yota",
  t2: "t2",
  tele2: "t2",
  теле2: "t2",
};

export function mapOperator(raw: string | null | undefined): Operator {
  return OP_MAP[(raw ?? "").toLowerCase().trim()] ?? "other";
}

/** Постранично выкачивает все номера партнёрки */
export async function* fetchPartnerNumbers(): AsyncGenerator<PartnerNumber[]> {
  if (!sourceConfigured()) {
    throw new Error("Источник номеров ещё не настроен (AC_API_BASE / AC_SESSION_TOKEN)");
  }
  const base = process.env.AC_API_BASE!;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.AC_SESSION_TOKEN) headers.Authorization = `Bearer ${process.env.AC_SESSION_TOKEN}`;
  if (process.env.AC_API_KEY) headers["X-Api-Key"] = process.env.AC_API_KEY;

  // TODO: заменить путь и разбор после изучения реального API
  for (let page = 1; page < 10_000; page++) {
    const r = await fetch(`${base}/numbers?page=${page}&per_page=1000`, { headers, cache: "no-store" });
    if (!r.ok) throw new Error(`Партнёрка ответила ${r.status}`);
    const json = (await r.json()) as { items?: Record<string, unknown>[] };
    const items = json.items ?? [];
    if (!items.length) return;
    yield items.map((it) => ({
      id: String(it.number ?? "").replace(/\D/g, "").slice(-10),
      operator: mapOperator(it.operator as string),
      region: (it.region as string) ?? null,
      tariff_name: (it.tariff_name as string) ?? null,
      tariff_price: it.tariff_price != null ? Number(it.tariff_price) : null,
      partner_price: it.price != null ? Number(it.price) : null,
    }));
  }
}
