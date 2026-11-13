"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { POPULAR_MASKS } from "@/lib/mask";
import { OPERATORS, type CatalogItem, type CatalogResult, type Operator } from "@/lib/types";
import { NumberRow } from "./NumberRow";
import { OperatorDot } from "./NumberDisplay";

const CODES = Array.from({ length: 100 }, (_, i) => String(900 + i));

interface Filters {
  code: string;
  digits: string[];
  q: string;
  ops: Operator[];
  tmin: string;
  tmax: string;
  region: string;
  mask: string;
  priced: boolean;
  sort: "beauty" | "price_asc" | "price_desc";
}

const EMPTY: Filters = {
  code: "",
  digits: Array(7).fill(""),
  q: "",
  ops: [],
  tmin: "",
  tmax: "",
  region: "",
  mask: "",
  priced: false,
  sort: "beauty",
};

function toParams(f: Filters, page: number) {
  const p = new URLSearchParams();
  if (f.code) p.set("code", f.code);
  if (f.digits.some(Boolean)) p.set("d", f.digits.map((d) => d || "_").join(""));
  if (f.q) p.set("q", f.q);
  if (f.ops.length) p.set("ops", f.ops.join(","));
  if (f.tmin) p.set("tmin", f.tmin);
  if (f.tmax) p.set("tmax", f.tmax);
  if (f.region) p.set("region", f.region);
  if (f.mask) p.set("mask", f.mask);
  if (f.priced) p.set("priced", "1");
  p.set("sort", f.sort);
  p.set("page", String(page));
  return p.toString();
}

export function Catalog({ regions, total, children }: { regions: string[]; total: number; children: React.ReactNode }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(true);
  const [showTariff, setShowTariff] = useState(true);
  const [res, setRes] = useState<{ items: CatalogItem[]; total: number; page: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const run = useCallback(
    async (filters: Filters, page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/numbers?${toParams(filters, page)}`);
        const data = (await r.json()) as CatalogResult & { error?: string };
        if (data.error) throw new Error(data.error);
        setRes((prev) => ({
          items: page > 1 && prev ? [...prev.items, ...data.items] : data.items,
          total: data.total,
          page,
        }));
        if (page === 1) setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clear = () => {
    setF(EMPTY);
    setRes(null);
  };

  const onDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setF((s) => {
      const digits = [...s.digits];
      digits[i] = d;
      return { ...s, digits };
    });
    if (d && i < 6) boxes.current[i + 1]?.focus();
  };

  const activeCount = useMemo(
    () =>
      [f.code, f.digits.some(Boolean), f.q, f.ops.length, f.tmin, f.tmax, f.region, f.mask, f.priced].filter(Boolean).length,
    [f],
  );

  const box = "h-12 w-full min-w-0 rounded-lg sm:rounded-xl border border-line bg-white text-center num text-lg sm:text-xl px-0 outline-none transition focus:border-aura focus:ring-4 focus:ring-aura/15";

  return (
    <>
      <form
        id="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(f, 1);
        }}
        className="card-glow scroll-mt-24 rounded-[28px] p-4 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold sm:text-xl">Поиск номеров</h2>
          <button type="button" onClick={clear} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper">
            Очистить ✕
          </button>
        </div>

        {/* Ячейки номера: код + 7 цифр */}
        <div className="mb-3 flex items-center gap-1.5 sm:gap-2">
          <select
            aria-label="Код"
            value={f.code}
            onChange={(e) => set("code", e.target.value)}
            className="num h-12 w-[4.1rem] shrink-0 rounded-xl border border-line bg-white px-2 text-lg outline-none focus:border-aura sm:w-24"
          >
            <option value="">9**</option>
            {CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="grid min-w-0 flex-1 grid-cols-[repeat(3,1fr)_auto_repeat(2,1fr)_auto_repeat(2,1fr)] items-center gap-1 sm:gap-2">
            {f.digits.map((d, i) => (
              <FragmentWithDash key={i} dash={i === 3 || i === 5}>
                <input
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  inputMode="numeric"
                  aria-label={`Цифра ${i + 4}`}
                  value={d}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus();
                  }}
                  className={box}
                />
              </FragmentWithDash>
            ))}
          </div>
        </div>

        <input
          value={f.q}
          onChange={(e) => set("q", e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="Поиск по цифрам, напр. 777"
          className="mb-3 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none placeholder:text-mute focus:border-aura focus:ring-4 focus:ring-aura/15"
        />

        {/* Операторы */}
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {OPERATORS.filter((o) => o.id !== "other").map((o) => {
            const on = f.ops.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => set("ops", on ? f.ops.filter((x) => x !== o.id) : [...f.ops, o.id])}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  on ? "border-aura bg-aura-soft text-aura-deep" : "border-line bg-white text-ink-soft hover:border-aura/40"
                }`}
              >
                <OperatorDot op={o.id} size={20} />
                {o.name}
              </button>
            );
          })}
        </div>

        {showFilters && (
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-sm font-bold">Цена тарифа, ₽/мес</div>
              <div className="grid grid-cols-2 gap-2">
                <input value={f.tmin} onChange={(e) => set("tmin", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="От 0 ₽" className="h-11 rounded-xl border border-line bg-white px-4 outline-none focus:border-aura" />
                <input value={f.tmax} onChange={(e) => set("tmax", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="До ∞ ₽" className="h-11 rounded-xl border border-line bg-white px-4 outline-none focus:border-aura" />
              </div>
            </div>
            <select value={f.region} onChange={(e) => set("region", e.target.value)} className="h-11 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-aura">
              <option value="">Все регионы</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <div>
              <div className="mb-1.5 text-sm font-bold">Маска</div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {POPULAR_MASKS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => set("mask", f.mask === m ? "" : m)}
                    className={`num shrink-0 rounded-xl border px-3 py-2 text-sm tracking-wider transition ${
                      f.mask === m ? "border-aura bg-aura text-white" : "border-line bg-white text-ink hover:border-aura/40"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-aura px-8 font-bold text-white shadow-lg shadow-aura/30 transition hover:bg-aura-deep active:scale-[0.99] sm:flex-none sm:min-w-56">
            <SearchIcon /> Искать{activeCount ? ` · ${activeCount}` : ""}
          </button>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="ml-auto rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper">
            {showFilters ? "⌃ Скрыть фильтры" : "⌄ Все фильтры"}
          </button>
        </div>
      </form>

      <div ref={resultsRef} className="scroll-mt-20">
        {res ? (
          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
              <Check checked={showTariff} onChange={setShowTariff} label="Тарифы" />
              <Check
                checked={f.priced}
                onChange={(v) => {
                  const nf = { ...f, priced: v };
                  setF(nf);
                  run(nf, 1);
                }}
                label="Только с ценой"
              />
              <select
                value={f.sort}
                onChange={(e) => {
                  const nf = { ...f, sort: e.target.value as Filters["sort"] };
                  setF(nf);
                  run(nf, 1);
                }}
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold"
              >
                <option value="beauty">Сначала красивые</option>
                <option value="price_asc">Сначала дешевле</option>
                <option value="price_desc">Сначала дороже</option>
              </select>
              <span className="ml-auto text-sm font-semibold text-ink-soft">
                Найдено: <span className="num text-ink">{new Intl.NumberFormat("ru-RU").format(res.total)}</span> шт
              </span>
            </div>
            <div className="card-glow overflow-hidden rounded-3xl">
              {res.items.length ? (
                res.items.map((n) => <NumberRow key={n.id} n={n} showTariff={showTariff} />)
              ) : (
                <div className="p-10 text-center text-ink-soft">
                  Ничего не нашли. Попробуйте убрать часть цифр или фильтров — или{" "}
                  <a href="#contact" className="font-bold text-aura">напишите нам</a>, подберём вручную.
                </div>
              )}
            </div>
            {res.items.length < res.total && (
              <button onClick={() => run(f, res.page + 1)} disabled={loading} className="mx-auto mt-4 block rounded-2xl border border-aura px-6 py-3 font-bold text-aura hover:bg-aura-soft disabled:opacity-50">
                {loading ? "Загружаем…" : "Показать ещё"}
              </button>
            )}
            <button onClick={clear} className="mx-auto mt-3 block text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
              ← Вернуться к подборке
            </button>
          </section>
        ) : (
          <div className="mt-3 px-1 text-sm text-ink-soft">
            В базе <span className="num text-ink">{new Intl.NumberFormat("ru-RU").format(total)}</span> номеров, обновляется каждый день
          </div>
        )}
        {loading && !res && <div className="mt-6 text-center text-ink-soft">Ищем…</div>}
        {error && <div className="mt-4 rounded-2xl bg-fire/10 p-4 text-sm text-fire">Ошибка поиска: {error}</div>}
      </div>

      {!res && children}
    </>
  );
}

function FragmentWithDash({ dash, children }: { dash: boolean; children: React.ReactNode }) {
  return (
    <>
      {dash && <span className="text-center font-bold text-mute sm:px-0.5">–</span>}
      {children}
    </>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-aura" />
      {label}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
