"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFavorites } from "./Favorites";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const icons = {
  home: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...s}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  ),
  lucky: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...s}>
      <path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  ),
  fav: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...s}>
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </svg>
  ),
  // две SIM-карты
  pairs: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...s}>
      <path d="M4 6.5 6.5 4H12v13H4z" />
      <path d="M12 7h5.5L20 9.5V20h-8" />
      <rect x="6.3" y="9.5" width="3.4" height="4" rx=".6" />
      <rect x="14.3" y="12.5" width="3.4" height="4" rx=".6" />
    </svg>
  ),
  // три SIM-карты веером
  trios: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...s}>
      <path d="M2.5 9 4.5 7h4v11h-6z" />
      <path d="M8.5 5.5h3l2 2V19h-5" />
      <path d="M13.5 8h4.5l3.5 3.5V20h-8" />
      <rect x="15.6" y="13" width="3" height="3.6" rx=".5" />
    </svg>
  ),
};

const TABS = [
  { href: "/", label: "Главная", icon: icons.home },
  { href: "/lucky", label: "Любимое число", icon: icons.lucky },
  { href: "/favorites", label: "Избранное", icon: icons.fav },
  { href: "/pairs", label: "Парные", icon: icons.pairs },
  { href: "/trios", label: "Тройки", icon: icons.trios },
];

/** Нижняя панель на телефоне */
export function TabBar() {
  const path = usePathname();
  const { ids } = useFavorites();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),8px)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between rounded-[22px] border border-white/70 bg-white/90 p-1.5 shadow-[0_10px_40px_-10px_rgba(26,68,232,0.45)] backdrop-blur-md">
        {TABS.map((t) => {
          const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] leading-tight font-bold transition ${
                on ? "bg-aura text-white shadow-md shadow-aura/40" : "text-ink-soft"
              }`}
            >
              {t.icon}
              <span className="text-center">{t.label}</span>
              {t.href === "/favorites" && ids.length > 0 && (
                <span className={`absolute top-0.5 right-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] ${on ? "bg-white text-aura" : "bg-[#ff3b5c] text-white"}`}>
                  {ids.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Та же навигация в шапке на компьютере */
export function DesktopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm font-bold md:flex">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${on ? "bg-aura text-white" : "text-ink-soft hover:text-aura"}`}>
            <span className="[&>svg]:h-4 [&>svg]:w-4">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
