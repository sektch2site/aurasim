"use client";

import { useBuy } from "./BuyProvider";

export function SellButton({ className = "" }: { className?: string }) {
  const open = useBuy();
  return (
    <button onClick={() => open({ kind: "sell" })} className={className}>
      Предложить номер на выкуп
    </button>
  );
}

export function TariffButton({ name }: { name: string }) {
  const open = useBuy();
  return (
    <button onClick={() => open({ kind: "tariff", name })} className="mt-4 w-full rounded-2xl border border-aura px-4 py-2.5 text-sm font-bold text-aura transition hover:bg-aura hover:text-white">
      Подключить
    </button>
  );
}
