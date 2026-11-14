"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

const KEY = "aura:favorites";

interface FavCtx {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  ready: boolean;
}

const Ctx = createContext<FavCtx>({ ids: [], has: () => false, toggle: () => {}, ready: false });

export function useFavorites() {
  return useContext(Ctx);
}
/* Избранное хранится в браузере посетителя (localStorage) */
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache ?? EMPTY;
}
function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // хранилище недоступно — работаем в памяти
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const toggle = useCallback((id: string) => {
    const prev = read();
    write(prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]);
  }, []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  return <Ctx.Provider value={{ ids, has, toggle, ready }}>{children}</Ctx.Provider>;
}


export function HeartButton({ id, className = "", light = false }: { id: string; className?: string; light?: boolean }) {
  const { has, toggle } = useFavorites();
  const on = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
      aria-label={on ? "Убрать из избранного" : "В избранное"}
      aria-pressed={on}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${
        light ? "bg-white/15 hover:bg-white/25" : "bg-aura-soft hover:bg-aura/15"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? "#ff3b5c" : "none"} stroke={on ? "#ff3b5c" : light ? "#fff" : "#1a44e8"} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
    </button>
  );
}
