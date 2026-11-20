"use client";

import { useEffect, useState } from "react";

/** Ручная подсветка: вводим номер, нажимаем на цифры, которые должны быть синими. */
export function MaskPicker({ action, initialId = "" }: { action: (f: FormData) => void; initialId?: string }) {
  const [raw, setRaw] = useState(initialId);
  const [mask, setMask] = useState<string[]>(Array(10).fill("0"));
  const [manual, setManual] = useState(false);
  const id = raw.replace(/\D/g, "").replace(/^[78](?=\d{10}$)/, "").slice(0, 10);
  const ready = id.length === 10;

  // подтягиваем текущую подсветку с сайта
  useEffect(() => {
    if (!ready) return;
    let stop = false;
    fetch(`/api/numbers?ids=${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (stop) return;
        const n = j.items?.[0];
        setMask((n?.beauty_mask ?? "0".repeat(10)).split(""));
        setManual(!!n?.mask_override);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, [id, ready]);

  const toggle = (i: number) => setMask((m) => m.map((v, k) => (k === i ? (v === "1" ? "0" : "1") : v)));
  const groups: [number, number][] = [
    [0, 3],
    [3, 6],
    [6, 8],
    [8, 10],
  ];

  return (
    <form action={action} className="grid gap-3">
      <input
        name="id"
        required
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Номер, напр. 977 107 33 33"
        className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-aura"
      />
      <input type="hidden" name="mask" value={mask.join("")} />
      {ready && (
        <>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="num text-xl text-ink">+7</span>
            {groups.map(([a, b]) => (
              <span key={a} className="flex gap-1">
                {id
                  .slice(a, b)
                  .split("")
                  .map((ch, k) => {
                    const i = a + k;
                    const on = mask[i] === "1";
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => toggle(i)}
                        className={`num h-11 w-9 rounded-lg border text-xl transition ${
                          on ? "border-aura bg-aura/10 text-aura" : "border-line bg-white text-ink"
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
              </span>
            ))}
          </div>
          <p className="text-xs text-mute">
            Нажимайте на цифры: синие будут выделены на сайте. {manual ? "Сейчас стоит ручная подсветка." : "Сейчас — автоматическая."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="h-11 rounded-xl bg-aura px-5 font-bold text-white hover:bg-aura-deep">Сохранить подсветку</button>
            <button name="reset" value="1" className="h-11 rounded-xl border border-line px-4 font-semibold hover:bg-paper">
              Вернуть автоматическую
            </button>
          </div>
        </>
      )}
    </form>
  );
}
