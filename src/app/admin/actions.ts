"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { analyzeBeauty } from "@/lib/beauty";
import { CATALOG_TAG } from "@/lib/data";
import { serviceClient } from "@/lib/supabase/admin";
import { getAdmin, sessionClient } from "@/lib/supabase/server";
import type { Operator, Settings } from "@/lib/types";

async function guard() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return serviceClient();
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const v = str(f, k).replace(/\D/g, "");
  return v ? Number(v) : null;
};
const phone = (v: string) => v.replace(/\D/g, "").slice(-10);

function done(tab: string, msg: string): never {
  updateTag(CATALOG_TAG);
  redirect(`/admin?tab=${tab}&ok=${encodeURIComponent(msg)}`);
}
function fail(tab: string, msg: string): never {
  redirect(`/admin?tab=${tab}&err=${encodeURIComponent(msg)}`);
}

/* ---------- вход ---------- */

export async function signIn(form: FormData) {
  const sb = await sessionClient();
  const { error } = await sb.auth.signInWithPassword({ email: str(form, "email"), password: str(form, "password") });
  if (error) redirect(`/admin/login?err=${encodeURIComponent("Неверная почта или пароль")}`);
  const admin = await getAdmin();
  if (!admin) {
    await sb.auth.signOut();
    redirect(`/admin/login?err=${encodeURIComponent("У этой почты нет доступа к админке")}`);
  }
  redirect("/admin");
}

export async function signOut() {
  const sb = await sessionClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}

/* ---------- номера ---------- */

/** Добавить/обновить номер вручную (цена, «было», оператор) */
export async function saveNumber(form: FormData) {
  const db = await guard();
  const id = phone(str(form, "id"));
  if (id.length !== 10) fail("numbers", "Номер должен содержать 10 цифр после +7");
  const b = analyzeBeauty(id);
  const { data: existing } = await db.from("numbers").select("id").eq("id", id).maybeSingle();
  const patch = {
    price_override: int(form, "price"),
    price_old: int(form, "price_old"),
    ...(str(form, "operator") ? { operator: str(form, "operator") as Operator } : {}),
    ...(str(form, "region") ? { region: str(form, "region") } : {}),
  };
  const { error } = existing
    ? await db.from("numbers").update(patch).eq("id", id)
    : await db.from("numbers").insert({ id, ...patch, source: "manual", beauty_score: b.score, beauty_mask: b.mask, tags: b.tags });
  if (error) fail("numbers", error.message);
  done("numbers", `Номер +7 ${id} сохранён`);
}

export async function toggleNumber(form: FormData) {
  const db = await guard();
  const id = phone(str(form, "id"));
  const active = str(form, "active") === "1";
  const { error } = await db.from("numbers").update({ is_active: active }).eq("id", id);
  if (error) fail("numbers", error.message);
  done("numbers", active ? "Номер показан на сайте" : "Номер скрыт с сайта");
}

/* ---------- подборка ---------- */

export async function addFeatured(form: FormData) {
  const db = await guard();
  const ids = str(form, "ids")
    .split(/[\n,;]+/)
    .map(phone)
    .filter((x) => x.length === 10);
  if (!ids.length) fail("featured", "Не нашёл ни одного номера");
  const { data: exist } = await db.from("numbers").select("id").in("id", ids);
  const known = new Set((exist ?? []).map((r) => r.id as string));
  const missing = ids.filter((i) => !known.has(i));
  if (missing.length) {
    await db.from("numbers").insert(
      missing.map((id) => {
        const b = analyzeBeauty(id);
        return { id, source: "manual", beauty_score: b.score, beauty_mask: b.mask, tags: b.tags };
      }),
    );
  }
  const { data: maxRow } = await db.from("featured").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  let pos = (maxRow?.position ?? 0) + 1;
  const { error } = await db.from("featured").upsert(ids.map((id) => ({ number_id: id, position: pos++ })));
  if (error) fail("featured", error.message);
  done("featured", `Добавлено в подборку: ${ids.length}`);
}

export async function moveFeatured(form: FormData) {
  const db = await guard();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const { data } = await db.from("featured").select("*").order("position");
  const list = (data ?? []) as { number_id: string; position: number }[];
  const i = list.findIndex((r) => r.number_id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) done("featured", "Порядок не изменён");
  [list[i], list[j]] = [list[j], list[i]];
  await db.from("featured").upsert(list.map((r, k) => ({ number_id: r.number_id, position: k })));
  done("featured", "Порядок обновлён");
}

export async function removeFeatured(form: FormData) {
  const db = await guard();
  await db.from("featured").delete().eq("number_id", str(form, "id"));
  done("featured", "Убрано из подборки");
}

/* ---------- пары / тройки ---------- */

export async function saveBundle(form: FormData) {
  const db = await guard();
  const numbers = str(form, "numbers")
    .split(/[\n,;]+/)
    .map(phone)
    .filter((x) => x.length === 10);
  if (numbers.length < 2 || numbers.length > 3) fail("bundles", "Нужно 2 или 3 номера");
  // номера должны существовать в таблице
  await db.from("numbers").upsert(
    numbers.map((id) => {
      const b = analyzeBeauty(id);
      return { id, beauty_score: b.score, beauty_mask: b.mask, tags: b.tags, source: "manual" };
    }),
    { onConflict: "id", ignoreDuplicates: true },
  );
  const row = {
    kind: numbers.length === 3 ? "trio" : "pair",
    title: str(form, "title") || null,
    numbers,
    price: int(form, "price"),
    price_old: int(form, "price_old"),
  };
  const id = str(form, "id");
  const { error } = id ? await db.from("bundles").update(row).eq("id", id) : await db.from("bundles").insert(row);
  if (error) fail("bundles", error.message);
  done("bundles", "Комплект сохранён");
}

export async function deleteBundle(form: FormData) {
  const db = await guard();
  await db.from("bundles").delete().eq("id", str(form, "id"));
  done("bundles", "Комплект удалён");
}

/* ---------- правила цен ---------- */

export async function saveRule(form: FormData) {
  const db = await guard();
  const row = {
    operator: str(form, "operator"),
    tariff_max: int(form, "tariff_max"),
    price_from: int(form, "price_from"),
    price_to: int(form, "price_to"),
    tariff_note: str(form, "tariff_note") || null,
  };
  const id = str(form, "id");
  const { error } = id ? await db.from("price_rules").update(row).eq("id", id) : await db.from("price_rules").insert(row);
  if (error) fail("rules", error.message);
  done("rules", "Правило сохранено");
}

export async function deleteRule(form: FormData) {
  const db = await guard();
  await db.from("price_rules").delete().eq("id", str(form, "id"));
  done("rules", "Правило удалено");
}

/* ---------- тарифы ---------- */

export async function saveTariff(form: FormData) {
  const db = await guard();
  const row = {
    operator: str(form, "operator"),
    name: str(form, "name"),
    price: int(form, "price") ?? 0,
    description: str(form, "description") || null,
    position: int(form, "position") ?? 0,
  };
  if (!row.name) fail("tariffs", "Укажите название");
  const id = str(form, "id");
  const { error } = id ? await db.from("tariffs").update(row).eq("id", id) : await db.from("tariffs").insert(row);
  if (error) fail("tariffs", error.message);
  done("tariffs", "Тариф сохранён");
}

export async function deleteTariff(form: FormData) {
  const db = await guard();
  await db.from("tariffs").delete().eq("id", str(form, "id"));
  done("tariffs", "Тариф удалён");
}

/* ---------- настройки ---------- */

export async function saveSettings(form: FormData) {
  const db = await guard();
  const data: Partial<Settings> = {
    telegram: str(form, "telegram").replace(/^@/, ""),
    whatsapp: str(form, "whatsapp"),
    max: str(form, "max"),
    phone: str(form, "phone"),
    markup_percent: Number(str(form, "markup_percent") || 0),
    round_to: Number(str(form, "round_to") || 500),
    hero_title: str(form, "hero_title"),
    hero_subtitle: str(form, "hero_subtitle"),
  };
  const { error } = await db.from("settings").upsert({ id: 1, data });
  if (error) fail("settings", error.message);
  done("settings", "Настройки сохранены");
}

/* ---------- партнёрка ---------- */

export async function savePartnerCookie(form: FormData) {
  const db = await guard();
  let cookie = str(form, "cookie");
  // принимаем и «PHPSESSID=abc», и просто значение, и целую строку Cookie
  const m = cookie.match(/PHPSESSID=([^;\s]+)/);
  if (m) cookie = m[1];
  if (!/^[A-Za-z0-9,-]{10,}$/.test(cookie)) fail("sync", "Похоже, это не PHPSESSID — скопируйте значение cookie целиком");
  const { error } = await db
    .from("partner_session")
    .upsert({ id: 1, cookie, status: "pending", message: "Cookie обновлён — проверка пройдёт в ближайшие 2 часа или при синхронизации", updated_at: new Date().toISOString() });
  if (error) fail("sync", error.message);
  done("sync", "Cookie сохранён");
}
