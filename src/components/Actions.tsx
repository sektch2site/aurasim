"use client";

import { useBuy } from "./BuyProvider";

export function PublishButton({ className = "", children = "Опубликовать номер" }: { className?: string; children?: React.ReactNode }) {
  const open = useBuy();
  return (
    <button onClick={() => open({ kind: "publish" })} className={className}>
      {children}
    </button>
  );
}

export function VideoButton({ className = "", children = "Процесс покупки" }: { className?: string; children?: React.ReactNode }) {
  const open = useBuy();
  return (
    <button onClick={() => open({ kind: "video" })} className={className}>
      {children}
    </button>
  );
}
