"use client";

import { useState } from "react";

const RU_LAT: Record<string, string> = { А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X" };
const clean = (raw: string) => {
  const m = raw
    .toUpperCase()
    .split("")
    .map((c) => RU_LAT[c] ?? c)
    .join("")
    .replace(/[^0-9A-Z*]/g, "")
    .slice(0, 10);
  return m.length === 7 ? "***" + m : m;
};

/** Своя комбинация: маска + цена от/до + какие символы выделять */
export function PatternForm({ action }: { action: (f: FormData) => void }) {
  const [raw, setRaw] = useState("");
  const [hl, setHl] = useState<string[]>(Array(10).fill("0"));
  const mask = clean(raw);
  const ready = mask.length === 10;
  const groups: [number, number][] = [
    [0, 3],
    [3, 6],
    [6, 8],
    [8, 10],
  ];
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
        <input
          name="mask"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Маска, напр. ***AABBCC или ***A0A0A0"
          autoCapitalize="characters"
          className="num h-11 rounded-xl border border-line bg-white px-3 tracking-wider outline-none focus:border-aura"
        />
        <input name="from" inputMode="numeric" required placeholder="Цена от" className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-aura" />
        <input name="to" inputMode="numeric" placeholder="Цена до" className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-aura" />
      </div>
      <input type="hidden" name="highlight" value={hl.join("")} />
      {ready && (
        <>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="num text-lg text-ink">+7</span>
            {groups.map(([a, b]) => (
              <span key={a} className="flex gap-1">
                {mask
                  .slice(a, b)
                  .split("")
                  .map((ch, k) => {
                    const i = a + k;
                    const on = hl[i] === "1";
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setHl((m) => m.map((v, j) => (j === i ? (v === "1" ? "0" : "1") : v)))}
                        className={`num h-10 w-8 rounded-lg border text-lg transition ${on ? "border-aura bg-aura/10 text-aura" : "border-line bg-white text-ink"}`}
                      >
                        {ch}
                      </button>
                    );
                  })}
              </span>
            ))}
          </div>
          <p className="text-xs text-mute">
            Нажмите на символы, которые выделять синим у таких номеров. Ничего не выбрано — выделение автоматическое.
          </p>
        </>
      )}
      <button className="h-11 rounded-xl bg-aura px-5 font-bold text-white hover:bg-aura-deep sm:w-56">Сохранить комбинацию</button>
    </form>
  );
}
