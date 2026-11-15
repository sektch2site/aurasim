import { numberGroups } from "@/lib/beauty";
import { OPERATOR_LOGOS, OPERATORS, type Operator } from "@/lib/types";

/** +7 961 044 40 04 — красивые цифры подсвечены синим */
export function NumberDisplay({
  id,
  mask,
  className = "",
  dim = "text-ink",
  fmt,
}: {
  id: string;
  mask: string;
  className?: string;
  dim?: string;
  /** длины групп, как номер записан в админке */
  fmt?: number[] | null;
}) {
  const groups = numberGroups(id, fmt);
  return (
    <span className={`num inline-flex items-baseline gap-[0.28em] whitespace-nowrap ${className}`} aria-label={`+7 ${id}`}>
      <span className={dim}>+7</span>
      {groups.map(([a, b]) => (
        <span key={a}>
          {id
            .slice(a, b)
            .split("")
            .map((ch, i) => (
              <span key={i} className={mask[a + i] === "1" ? "text-aura" : dim}>
                {ch}
              </span>
            ))}
        </span>
      ))}
    </span>
  );
}

export function OperatorDot({ op, size = 22 }: { op: Operator; size?: number }) {
  const o = OPERATORS.find((x) => x.id === op)!;
  const logo = OPERATOR_LOGOS[op];
  if (logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={o.name} title={o.name} width={size} height={size} className={`shrink-0 bg-white object-cover ring-1 ring-black/10 ${op === "mts" ? "rounded-[22%]" : "rounded-full"}`} style={{ width: size, height: size }} />;
  const letter = { beeline: "Б", megafon: "М", mts: "МТС", yota: "Y", t2: "t2", other: "•" }[op];
  return (
    <span
      title={o.name}
      className="inline-grid shrink-0 place-items-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        background: o.color,
        color: op === "beeline" ? "#111" : "#fff",
        fontSize: letter.length > 1 ? size * 0.32 : size * 0.48,
      }}
    >
      {letter}
    </span>
  );
}

export function operatorName(op: Operator) {
  return OPERATORS.find((x) => x.id === op)?.name ?? op;
}
