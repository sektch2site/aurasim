"use client";

import { useCallback, useRef, useState } from "react";
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
  mask: string;
  priced: boolean;
  sort: "beauty" | "price_asc" | "price_desc";
}

const EMPTY: Filters = { code: "", digits: Array(7).fill(""), q: "", ops: [], mask: "", priced: false, sort: "beauty" };
const PAGE = 30;

function toParams(f: Filters, page: number) {
  const p = new URLSearchParams();
  if (f.code) p.set("code", f.code);
  if (f.digits.some(Boolean)) p.set("d", f.digits.map((d) => d || "_").join(""));
  if (f.q) p.set("q", f.q);
  if (f.ops.length) p.set("ops", f.ops.join(","));
  if (f.mask) p.set("mask", f.mask);
  if (f.priced) p.set("priced", "1");
  p.set("sort", f.sort);
  p.set("page", String(page));
  p.set("size", String(PAGE));
  return p.toString();
}

const isEmpty = (f: Filters) => !f.code && !f.digits.some(Boolean) && !f.q && !f.ops.length && !f.mask && !f.priced && f.sort === "beauty";

/**
 * Поиск + список номеров. Пока фильтры пустые — показываем «Все номера» (начальная страница с сервера),
 * между поиском и списком — слот `featured` (номера недели).
 */
export function Catalog({ initial, featured }: { initial: CatalogResult; featured?: React.ReactNode }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [res, setRes] = useState<{ items: CatalogItem[]; total: number; page: number; searched: boolean }>({
    items: initial.items,
    total: initial.total,
    page: 1,
    searched: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const run = useCallback(async (filters: Filters, page = 1, scroll = true) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/numbers?${toParams(filters, page)}`);
      const data = (await r.json()) as CatalogResult & { error?: string };
      if (data.error) throw new Error(data.error);
      setRes((prev) => ({
        items: page > 1 ? [...prev.items, ...data.items] : data.items,
        total: data.total,
        page,
        searched: !isEmpty(filters),
      }));
      if (page === 1 && scroll) setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = () => {
    setF(EMPTY);
    setRes({ items: initial.items, total: initial.total, page: 1, searched: false });
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

  const box =
    "h-11 w-full min-w-0 rounded-lg sm:rounded-xl border border-line bg-white px-0 text-center num text-lg sm:text-xl outline-none transition focus:border-aura focus:ring-4 focus:ring-aura/15";

  return (
    <>
      <form
        id="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(f, 1);
        }}
        className="card-glow scroll-mt-20 rounded-[24px] p-3.5 sm:p-5"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold sm:text-lg">Поиск номеров</h2>
          <button type="button" onClick={clear} className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-paper">
            Очистить ✕
          </button>
        </div>

        <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
          <select
            aria-label="Код"
            value={f.code}
            onChange={(e) => set("code", e.target.value)}
            className="num h-11 w-[4.1rem] shrink-0 rounded-lg border border-line bg-white px-1.5 text-base outline-none focus:border-aura sm:w-24 sm:rounded-xl sm:text-lg"
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
              <Cell key={i} dash={i === 3 || i === 5}>
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
              </Cell>
            ))}
          </div>
        </div>

        <input
          value={f.q}
          onChange={(e) => set("q", e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="Любимые цифры, напр. 777"
          className="mb-2 h-11 w-full rounded-xl border border-line bg-white px-4 text-base outline-none placeholder:text-mute focus:border-aura focus:ring-4 focus:ring-aura/15"
        />

        <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
          {OPERATORS.filter((o) => o.id !== "other").map((o) => {
            const on = f.ops.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => set("ops", on ? f.ops.filter((x) => x !== o.id) : [...f.ops, o.id])}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm font-semibold transition ${
                  on ? "border-aura bg-aura-soft text-aura-deep" : "border-line bg-white text-ink-soft hover:border-aura/40"
                }`}
              >
                <OperatorDot op={o.id} size={20} />
                {o.name}
              </button>
            );
          })}
        </div>

        <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
          {POPULAR_MASKS.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => set("mask", f.mask === m ? "" : m)}
              className={`num shrink-0 rounded-xl border px-2.5 py-1.5 text-[13px] tracking-wider transition ${
                f.mask === m ? "border-aura bg-aura text-white" : "border-line bg-white text-ink hover:border-aura/40"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-aura px-8 font-bold text-white shadow-lg shadow-aura/30 transition hover:bg-aura-deep active:scale-[0.99] sm:w-auto sm:min-w-56"
        >
          <SearchIcon /> Искать
        </button>
      </form>

      {!res.searched && featured}

      <section ref={listRef} className="mt-6 scroll-mt-20">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
          <h2 className="font-display mr-auto text-lg font-extrabold sm:text-xl">{res.searched ? "Результаты поиска" : "Все номера"}</h2>
          <span className="text-sm font-semibold text-ink-soft">
            Найдено: <span className="num text-ink">{new Intl.NumberFormat("ru-RU").format(res.total)}</span> шт
          </span>
        </div>
        <div className="mb-2.5 flex flex-wrap items-center gap-3 px-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold select-none">
            <input
              type="checkbox"
              checked={f.priced}
              onChange={(e) => {
                const nf = { ...f, priced: e.target.checked };
                setF(nf);
                run(nf, 1, false);
              }}
              className="h-5 w-5 accent-aura"
            />
            Только с ценой
          </label>
          <select
            value={f.sort}
            onChange={(e) => {
              const nf = { ...f, sort: e.target.value as Filters["sort"] };
              setF(nf);
              run(nf, 1, false);
            }}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold"
          >
            <option value="beauty">Сначала красивые</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
          </select>
        </div>

        <div className="space-y-2">
          {res.items.map((n) => (
            <NumberRow key={n.id} n={n} />
          ))}
          {!res.items.length && !loading && (
            <div className="card-glow rounded-2xl p-8 text-center text-ink-soft">
              {res.searched ? "Ничего не нашли — уберите часть цифр или фильтров, или напишите нам: подберём вручную." : "Номера скоро появятся."}
            </div>
          )}
        </div>
        {res.items.length < res.total && (
          <button
            onClick={() => run(f, res.page + 1, false)}
            disabled={loading}
            className="mx-auto mt-4 block rounded-2xl border-2 border-aura px-6 py-2.5 font-bold text-aura hover:bg-aura-soft disabled:opacity-50"
          >
            {loading ? "Загружаем…" : "Показать ещё"}
          </button>
        )}
        {res.searched && (
          <button onClick={clear} className="mx-auto mt-3 block text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
            ← Сбросить поиск
          </button>
        )}
        {error && <div className="mt-4 rounded-2xl bg-fire/10 p-4 text-sm text-fire">Ошибка поиска: {error}</div>}
      </section>
    </>
  );
}

function Cell({ dash, children }: { dash: boolean; children: React.ReactNode }) {
  return (
    <>
      {dash && <span className="text-center font-bold text-mute sm:px-0.5">–</span>}
      {children}
    </>
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
