import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NumberDisplay, operatorName } from "@/components/NumberDisplay";
import { formatNumber } from "@/lib/beauty";
import { formatRub } from "@/lib/pricing";
import { serviceClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/env";
import { getAdmin } from "@/lib/supabase/server";
import { sourceConfigured } from "@/lib/source/agentstvo";
import { DEFAULT_SETTINGS, OPERATORS, type Bundle, type PhoneNumber, type PriceRule, type Settings, type Tariff } from "@/lib/types";
import * as A from "./actions";

export const metadata = { title: "Админка — Aura sim", robots: { index: false } };

const TABS = [
  ["featured", "Подборка"],
  ["numbers", "Номера и цены"],
  ["bundles", "Пары и тройки"],
  ["rules", "Правила цен"],
  ["tariffs", "Тарифы"],
  ["settings", "Настройки"],
  ["sync", "Синхронизация"],
] as const;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<div className="text-ink-soft">Загрузка…</div>}>
        <Admin searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Admin({ searchParams }: { searchParams: SP }) {
  if (!hasSupabase)
    return (
      <div className="card-glow rounded-3xl p-8">
        <h1 className="font-display text-2xl font-bold">Админка</h1>
        <p className="mt-3 text-ink-soft">
          База Supabase ещё не подключена — сайт показывает тестовые данные. Добавьте переменные окружения NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY.
        </p>
      </div>
    );
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const sp = await searchParams;
  const tab = (String(sp.tab ?? "featured") as (typeof TABS)[number][0]) || "featured";
  const ok = sp.ok ? String(sp.ok) : null;
  const err = sp.err ? String(sp.err) : null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Админка</h1>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          {admin.email}
          <form action={A.signOut}>
            <button className="rounded-full border border-line px-3 py-1.5 font-semibold hover:bg-white">Выйти</button>
          </form>
        </div>
      </div>
      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin?tab=${id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === id ? "bg-aura text-white" : "bg-white text-ink-soft hover:text-aura"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {ok && <div className="mb-4 rounded-2xl bg-money-soft p-3 text-sm font-semibold text-money">✓ {ok}</div>}
      {err && <div className="mb-4 rounded-2xl bg-fire/10 p-3 text-sm font-semibold text-fire">{err}</div>}
      {tab === "featured" && <Featured />}
      {tab === "numbers" && <Numbers q={sp.q ? String(sp.q) : ""} />}
      {tab === "bundles" && <Bundles />}
      {tab === "rules" && <Rules />}
      {tab === "tariffs" && <Tariffs />}
      {tab === "settings" && <SettingsTab />}
      {tab === "sync" && <Sync />}
    </>
  );
}

/* ---------- UI-кусочки ---------- */

const input = "h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-aura";
const btn = "h-11 rounded-xl bg-aura px-5 font-bold text-white hover:bg-aura-deep";
const ghost = "rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:bg-paper";

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card-glow mb-5 rounded-3xl p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {note && <p className="mt-1 mb-4 text-sm text-ink-soft">{note}</p>}
      <div className={note ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function OperatorSelect({ name, value, any }: { name: string; value?: string; any?: boolean }) {
  return (
    <select name={name} defaultValue={value ?? ""} className={input}>
      {any && <option value="">— не менять —</option>}
      {OPERATORS.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

/* ---------- Подборка ---------- */

async function Featured() {
  const db = serviceClient();
  const { data } = await db.from("featured").select("number_id, position, numbers(*)").order("position");
  const rows = (data ?? []) as unknown as { number_id: string; numbers: PhoneNumber | null }[];
  return (
    <>
      <Card title="Добавить в подборку" note="Номера показываются под поиском, в этом порядке. Можно вставить сразу несколько — через запятую или с новой строки. Ниже подборки сайт сам показывает самые красивые номера.">
        <form action={A.addFeatured} className="flex flex-col gap-3 sm:flex-row">
          <textarea name="ids" rows={2} placeholder="+7 961 044 40 04, 932 888 82 82" className={`${input} h-auto flex-1 py-2`} />
          <button className={btn}>Добавить</button>
        </form>
      </Card>
      <Card title={`В подборке: ${rows.length}`}>
        <div className="divide-y divide-line">
          {rows.map((r, i) => (
            <div key={r.number_id} className="flex items-center gap-3 py-2.5">
              <span className="w-6 text-sm text-mute">{i + 1}</span>
              <NumberDisplay id={r.number_id} mask={r.numbers?.beauty_mask ?? "0".repeat(10)} className="flex-1 text-lg" />
              {!r.numbers?.is_active && <span className="rounded bg-fire/10 px-2 py-0.5 text-xs font-bold text-fire">нет в партнёрке</span>}
              <form action={A.moveFeatured}>
                <input type="hidden" name="id" value={r.number_id} />
                <input type="hidden" name="dir" value="up" />
                <button className={ghost} aria-label="Выше">↑</button>
              </form>
              <form action={A.moveFeatured}>
                <input type="hidden" name="id" value={r.number_id} />
                <input type="hidden" name="dir" value="down" />
                <button className={ghost} aria-label="Ниже">↓</button>
              </form>
              <form action={A.removeFeatured}>
                <input type="hidden" name="id" value={r.number_id} />
                <button className={`${ghost} text-fire`}>Убрать</button>
              </form>
            </div>
          ))}
          {!rows.length && <p className="py-4 text-sm text-ink-soft">Пока пусто.</p>}
        </div>
      </Card>
    </>
  );
}

/* ---------- Номера ---------- */

async function Numbers({ q }: { q: string }) {
  const db = serviceClient();
  const digits = q.replace(/\D/g, "");
  let query = db.from("numbers").select("*").order("beauty_score", { ascending: false }).limit(50);
  if (digits) query = query.like("id", `%${digits.slice(-10)}%`);
  else query = query.or("price_override.not.is.null,source.eq.manual");
  const { data } = await query;
  const rows = (data ?? []) as PhoneNumber[];
  return (
    <>
      <Card title="Задать цену номеру" note="Ручная цена важнее цены из партнёрки и правил. «Было» — для зачёркнутой цены. Если номера нет в базе — он добавится как ручной.">
        <form action={A.saveNumber} className="grid gap-3 sm:grid-cols-6">
          <input name="id" required placeholder="Номер" className={`${input} sm:col-span-2`} />
          <input name="price" inputMode="numeric" placeholder="Цена, ₽" className={input} />
          <input name="price_old" inputMode="numeric" placeholder="Было, ₽" className={input} />
          <OperatorSelect name="operator" any />
          <button className={btn}>Сохранить</button>
        </form>
      </Card>
      <Card title={digits ? `Поиск: ${digits}` : "Номера с ручной ценой"}>
        <form className="mb-4 flex gap-2">
          <input type="hidden" name="tab" value="numbers" />
          <input name="q" defaultValue={q} placeholder="Найти номер в базе" className={`${input} flex-1`} />
          <button className={btn}>Найти</button>
        </form>
        <div className="divide-y divide-line">
          {rows.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
              <NumberDisplay id={n.id} mask={n.beauty_mask} className="min-w-52 text-lg" />
              <span className="text-ink-soft">{operatorName(n.operator)}</span>
              <span className="text-ink-soft">{n.tariff_name ? `${n.tariff_name} ${n.tariff_price ?? ""}₽` : ""}</span>
              <span>партнёрка: {n.partner_price ? formatRub(n.partner_price) : "—"}</span>
              <span className="font-bold text-money">{n.price_override ? formatRub(n.price_override) : ""}</span>
              <span className="text-mute">балл {n.beauty_score}</span>
              <form action={A.toggleNumber} className="ml-auto">
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="active" value={n.is_active ? "0" : "1"} />
                <button className={ghost}>{n.is_active ? "Скрыть" : "Показать"}</button>
              </form>
            </div>
          ))}
          {!rows.length && <p className="py-4 text-sm text-ink-soft">Ничего не найдено.</p>}
        </div>
      </Card>
    </>
  );
}

/* ---------- Пары и тройки ---------- */

async function Bundles() {
  const { data } = await serviceClient().from("bundles").select("*").order("position");
  const rows = (data ?? []) as Bundle[];
  return (
    <>
      <Card title="Новая пара или тройка" note="2 номера — пара, 3 — тройка.">
        <form action={A.saveBundle} className="grid gap-3 sm:grid-cols-2">
          <textarea name="numbers" rows={3} required placeholder={"+7 930 933 99 93\n+7 930 993 33 93\n+7 930 933 99 39"} className={`${input} h-auto py-2 sm:row-span-2`} />
          <input name="title" placeholder="Заголовок, напр. «Интересная тройка»" className={input} />
          <div className="grid grid-cols-2 gap-3">
            <input name="price" inputMode="numeric" placeholder="Цена за комплект" className={input} />
            <input name="price_old" inputMode="numeric" placeholder="Было" className={input} />
          </div>
          <button className={`${btn} sm:col-start-2`}>Создать</button>
        </form>
      </Card>
      {rows.map((b) => (
        <Card key={b.id} title={b.title ?? (b.kind === "trio" ? "Тройка" : "Пара")}>
          <div className="mb-3 space-y-1">
            {b.numbers.map((n) => (
              <div key={n} className="num text-lg">{formatNumber(n)}</div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-money">{b.price ? formatRub(b.price) : "цена по запросу"}</span>
            <form action={A.deleteBundle} className="ml-auto">
              <input type="hidden" name="id" value={b.id} />
              <button className={`${ghost} text-fire`}>Удалить</button>
            </form>
          </div>
        </Card>
      ))}
    </>
  );
}

/* ---------- Правила цен ---------- */

async function Rules() {
  const { data } = await serviceClient().from("price_rules").select("*").order("operator");
  const rows = (data ?? []) as PriceRule[];
  return (
    <>
      <Card
        title="Правила цен по тарифу"
        note="Для номеров без цены из партнёрки и без ручной цены: оператор + тариф до N ₽/мес → диапазон цены. Берётся правило с самым маленьким подходящим порогом. Если правила нет — на сайте «Запросить цену»."
      >
        <form action={A.saveRule} className="grid gap-3 sm:grid-cols-6">
          <OperatorSelect name="operator" />
          <input name="tariff_max" inputMode="numeric" placeholder="Тариф до, ₽/мес" className={input} />
          <input name="price_from" inputMode="numeric" required placeholder="Цена от" className={input} />
          <input name="price_to" inputMode="numeric" placeholder="Цена до" className={input} />
          <input name="tariff_note" placeholder="Подпись: «любой тариф»" className={input} />
          <button className={btn}>Добавить</button>
        </form>
      </Card>
      <Card title={`Правил: ${rows.length}`}>
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <form key={r.id} action={A.saveRule} className="grid items-center gap-2 py-2.5 sm:grid-cols-7">
              <input type="hidden" name="id" value={r.id} />
              <OperatorSelect name="operator" value={r.operator} />
              <input name="tariff_max" defaultValue={r.tariff_max ?? ""} placeholder="любой" className={input} />
              <input name="price_from" defaultValue={r.price_from ?? ""} className={input} />
              <input name="price_to" defaultValue={r.price_to ?? ""} className={input} />
              <input name="tariff_note" defaultValue={r.tariff_note ?? ""} className={input} />
              <button className={ghost}>Сохранить</button>
              <button formAction={A.deleteRule} className={`${ghost} text-fire`}>Удалить</button>
            </form>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ---------- Тарифы ---------- */

async function Tariffs() {
  const { data } = await serviceClient().from("tariffs").select("*").order("position");
  const rows = (data ?? []) as Tariff[];
  return (
    <>
      <Card title="Новый тариф" note="Показываются в блоке «Выгодные тарифы».">
        <form action={A.saveTariff} className="grid gap-3 sm:grid-cols-6">
          <OperatorSelect name="operator" />
          <input name="name" required placeholder="Название" className={input} />
          <input name="price" inputMode="numeric" required placeholder="₽/мес" className={input} />
          <input name="description" placeholder="Описание" className={`${input} sm:col-span-2`} />
          <button className={btn}>Добавить</button>
        </form>
      </Card>
      <Card title={`Тарифов: ${rows.length}`}>
        <div className="divide-y divide-line">
          {rows.map((t) => (
            <form key={t.id} action={A.saveTariff} className="grid items-center gap-2 py-2.5 sm:grid-cols-8">
              <input type="hidden" name="id" value={t.id} />
              <OperatorSelect name="operator" value={t.operator} />
              <input name="name" defaultValue={t.name} className={input} />
              <input name="price" defaultValue={t.price} className={input} />
              <input name="description" defaultValue={t.description ?? ""} className={`${input} sm:col-span-2`} />
              <input name="position" defaultValue={t.position} title="Порядок" className={input} />
              <button className={ghost}>Сохранить</button>
              <button formAction={A.deleteTariff} className={`${ghost} text-fire`}>Удалить</button>
            </form>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ---------- Настройки ---------- */

async function SettingsTab() {
  const { data } = await serviceClient().from("settings").select("data").eq("id", 1).maybeSingle();
  const s: Settings = { ...DEFAULT_SETTINGS, ...((data?.data as Partial<Settings>) ?? {}) };
  const field = (name: keyof Settings, label: string, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input name={name} defaultValue={String(s[name] ?? "")} className={`${input} w-full`} />
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
  return (
    <Card title="Настройки сайта">
      <form action={A.saveSettings} className="grid gap-4 sm:grid-cols-2">
        {field("telegram", "Telegram для заявок", "Без @, напр. emaksonnn")}
        {field("whatsapp", "WhatsApp", "Номер, напр. 79161234567. Пусто — кнопки не будет")}
        {field("max", "Ссылка на MAX", "Пусто — кнопки не будет")}
        {field("phone", "Телефон для звонка", "Пусто — кнопки не будет")}
        {field("markup_percent", "Наценка на цену партнёрки, %", "0 — показывать как в партнёрке")}
        {field("round_to", "Округлять цену до, ₽")}
        {field("hero_title", "Надпись над заголовком")}
        {field("hero_subtitle", "Подзаголовок")}
        <button className={`${btn} sm:col-span-2`}>Сохранить</button>
      </form>
    </Card>
  );
}

/* ---------- Синхронизация ---------- */

async function Sync() {
  const db = serviceClient();
  const [{ data: runs }, { count: active }, { count: all }] = await Promise.all([
    db.from("sync_runs").select("*").order("id", { ascending: false }).limit(10),
    db.from("numbers").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("numbers").select("id", { count: "exact", head: true }),
  ]);
  return (
    <>
      <Card title="Синхронизация с партнёркой" note="Запускается автоматически раз в сутки. Новые номера появляются на сайте, проданные — скрываются.">
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-paper p-3">На сайте: <b className="num">{active ?? 0}</b></div>
          <div className="rounded-2xl bg-paper p-3">Всего в базе: <b className="num">{all ?? 0}</b></div>
          <div className="rounded-2xl bg-paper p-3">Источник: <b>{sourceConfigured() ? "настроен" : "не настроен"}</b></div>
        </div>
        <form action={A.syncNow}>
          <button className={btn} disabled={!sourceConfigured()}>Синхронизировать сейчас</button>
        </form>
      </Card>
      <Card title="Последние запуски">
        <div className="divide-y divide-line text-sm">
          {((runs ?? []) as { id: number; started_at: string; added: number; updated: number; removed: number; error: string | null }[]).map((r) => (
            <div key={r.id} className="flex flex-wrap gap-4 py-2">
              <span className="text-mute">{new Date(r.started_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</span>
              {r.error ? <span className="text-fire">{r.error}</span> : <span>+{r.added} · обновлено {r.updated} · снято {r.removed}</span>}
            </div>
          ))}
          {!runs?.length && <p className="py-2 text-ink-soft">Запусков ещё не было.</p>}
        </div>
      </Card>
    </>
  );
}
