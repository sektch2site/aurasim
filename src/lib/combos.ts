/**
 * Комбинации с ценой по правилам Ильи (17.11.2026). Номер — 10 цифр без +7.
 * Общие для цены (pricing.ts) и подсветки (beauty.ts).
 */

const runsOf = (s: string): { at: number; len: number }[] => {
  const out: { at: number; len: number }[] = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[i]) j++;
    out.push({ at: i, len: j - i + 1 });
    i = j + 1;
  }
  return out;
};

const isAbabEnd = (id: string) => id[6] === id[8] && id[7] === id[9] && id[6] !== id[7];

/** 977 79* AB AB — код «отражается» в начале номера (97779) + ABAB на конце, где A или B есть в коде */
export function isMirrorCodeAbab(id: string): boolean {
  if (!(id[3] === id[1] && id[4] === id[0] && id[0] !== id[1])) return false;
  if (!isAbabEnd(id)) return false;
  const code = id.slice(0, 3);
  return code.includes(id[6]) || code.includes(id[7]);
}

/** Подсветка для 977 79* AB AB: код + две цифры, затем окончание; одна цифра между ними — тёмная */
export const MIRROR_CODE_ABAB_MASK = "1111101111";

export type AabbTier = "plain" | "linked" | "code" | "global";

/**
 * Окончание AABB (44 22).
 * plain  — не связано с номером (980 679 44 22) → 1000
 * linked — цифры окончания или тройка есть в середине (969 062 00 22, 967 156 66 11) → 1500–2000
 * code   — тройка и середина собрана из цифр кода/окончания (936 996 66 44) → 5000, код подсвечиваем
 * global — сразу после кода три одинаковых (916 000 11 66) → 5000–7000
 */
export function aabbTier(id: string): AabbTier | null {
  const A = id[6];
  const B = id[8];
  if (!(id[7] === A && id[9] === B && A !== B)) return null;
  const body = id.slice(3);
  if (new Set(body).size <= 2) return null; // из двух цифр — это уже дорогой номер
  const runs = runsOf(body);
  if (runs.some((r) => r.len >= 4)) return null;
  const mid = id.slice(3, 6);
  if (mid[0] === mid[1] && mid[1] === mid[2]) return "global";
  const code = id.slice(0, 3);
  const triple = runs.some((r) => r.len === 3);
  const fromCode = [...mid].every((d) => code.includes(d) || d === A || d === B) && [...mid].some((d) => code.includes(d));
  if (triple && fromCode) return "code";
  if (triple || mid.includes(A) || mid.includes(B) || mid[0] === mid[1] || mid[1] === mid[2]) return "linked";
  return "plain";
}

/**
 * Ровно три одинаковых в середине (980 111 68 33): 1200.
 * Если тройка сочетается с кодом (939 999 01 66) или с окончанием/кодом в конце (916 000 16 11) — 4000–7000.
 * Возвращает null, если номер не про это (другие узоры решают сами).
 */
export function middleTriple(id: string): "plain" | "linked" | null {
  const body = id.slice(3);
  if (new Set(body).size <= 2) return null;
  const runs = runsOf(body).filter((r) => r.len >= 3);
  if (runs.length !== 1) return null;
  const r = runs[0];
  if (r.len !== 3 || r.at > 2) return null; // тройка начинается на 4–6-й цифре номера
  if (isAbabEnd(id)) return null;
  const A = body[r.at];
  const code = id.slice(0, 3);
  // цифры после тройки (тройка занимает позиции 3+at … 5+at)
  const rest = [...id.slice(6 + r.at)];
  const joinsCode = r.at === 0 && code[2] === A;
  const repeatsA = rest.filter((d) => d === A).length >= 2;
  const restFromCode = rest.length >= 2 && rest.every((d) => code.includes(d) || d === A) && rest.some((d) => d !== A);
  if (joinsCode || repeatsA || restFromCode) return "linked";
  return "plain";
}

/** Пары без узора: окончание на пару, три разные цифры после кода, без троек (930 022 92 00) → 1500–2000 */
export function isLoosePairs(id: string): boolean {
  const body = id.slice(3);
  if (id[8] !== id[9] || id[7] === id[8]) return false;
  if (new Set(body).size !== 3) return false;
  return !/(\d)\1\1/.test(body);
}
