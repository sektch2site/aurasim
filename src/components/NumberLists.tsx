"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem, CatalogResult } from "@/lib/types";
import { useFavorites } from "./Favorites";
import { NumberRow } from "./NumberRow";

/** Избранное: номера из браузера посетителя */
export function FavoritesList() {
  const { ids, ready } = useFavorites();
  const [loaded, setLoaded] = useState<{ key: string; items: CatalogItem[] } | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!ready || !key) return;
    let alive = true;
    fetch(`/api/numbers?ids=${key}`)
      .then((r) => r.json())
      .then((d: CatalogResult) => alive && setLoaded({ key, items: d.items ?? [] }))
      .catch(() => alive && setLoaded({ key, items: [] }));
    return () => {
      alive = false;
    };
  }, [key, ready]);

  const items = !key ? [] : loaded?.key === key ? loaded.items : loaded ? loaded.items : null;
  if (!ready || items === null) return <p className="text-ink-soft">Загружаем…</p>;
  // номер могли продать — показываем только те, что ещё в базе
  const shown = items.filter((i) => ids.includes(i.id));
  if (!shown.length)
    return (
      <div className="card-glow rounded-3xl p-8 text-center text-ink-soft">
        Здесь будут номера, которые вы отметили ♥. Нажмите на сердечко у любого номера.
      </div>
    );
  return (
    <div className="space-y-2">
      {shown.map((n) => (
        <NumberRow key={n.id} n={n} />
      ))}
    </div>
  );
}

/** Любимое число: ищем номера, где есть эти цифры */
export function LuckySearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ items: CatalogItem[]; total: number; page: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (page = 1) => {
    const digits = q.replace(/\D/g, "");
    if (!digits) return;
    setLoading(true);
    try {
      const d = (await (await fetch(`/api/numbers?q=${digits}&page=${page}&size=30`)).json()) as CatalogResult;
      setRes((prev) => ({ items: page > 1 && prev ? [...prev.items, ...d.items] : d.items, total: d.total, page }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => input.current?.focus(), []);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(1);
        }}
        className="aura-card mb-5 rounded-[26px] p-4 text-white sm:p-6"
      >
        <label className="relative mb-3 block text-sm font-bold text-white/85">Введите любимое число — дату рождения, год, счастливые цифры</label>
        <div className="relative flex gap-2">
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="например 777 или 1997"
            className="num h-14 min-w-0 flex-1 rounded-2xl border-2 border-white/50 bg-white px-4 text-2xl text-ink outline-none placeholder:text-base placeholder:font-semibold placeholder:text-mute focus:border-white"
          />
          <button className="rounded-2xl bg-ink px-5 font-extrabold text-white hover:bg-black">Найти</button>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-2">
          {["777", "2025", "0000", "1111", "1234", "8888"].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => {
                setQ(x);
                setTimeout(() => input.current?.form?.requestSubmit(), 0);
              }}
              className="num rounded-full bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
            >
              {x}
            </button>
          ))}
        </div>
      </form>

      {res && (
        <>
          <div className="mb-2 px-1 text-sm font-semibold text-ink-soft">
            Найдено: <span className="num text-ink">{new Intl.NumberFormat("ru-RU").format(res.total)}</span> шт
          </div>
          <div className="space-y-2">
            {res.items.map((n) => (
              <NumberRow key={n.id} n={n} />
            ))}
            {!res.items.length && <div className="card-glow rounded-2xl p-8 text-center text-ink-soft">С такими цифрами сейчас ничего нет — напишите нам, подберём.</div>}
          </div>
          {res.items.length < res.total && (
            <button onClick={() => run(res.page + 1)} disabled={loading} className="mx-auto mt-4 block rounded-2xl border-2 border-aura px-6 py-2.5 font-bold text-aura hover:bg-aura-soft disabled:opacity-50">
              {loading ? "Загружаем…" : "Показать ещё"}
            </button>
          )}
        </>
      )}
    </>
  );
}
