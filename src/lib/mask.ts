/**
 * Маски как в партнёрке: «*****AAAA*», «****ABABAB», «AAA***BCBC».
 * * — любая цифра, цифра — точное совпадение,
 * одинаковые буквы — одинаковые цифры, разные буквы — разные цифры.
 * Маска короче 10 символов прикладывается к концу номера.
 */

export const POPULAR_MASKS = [
  "*****AAAA*",
  "****ABABAB",
  "AAA***BCBC",
  "******ABAB",
  "******A0A0",
  "***AAABCBC",
  "****AAAA**",
  "******AAAA",
  "***AAA*AAA",
];

export function normalizeMask(mask: string): string {
  const m = mask.toUpperCase().replace(/[^0-9A-Z*]/g, "").slice(0, 10);
  return m.padStart(10, "*");
}

export function matchMask(id: string, rawMask: string): boolean {
  const mask = normalizeMask(rawMask);
  const map = new Map<string, string>();
  const used = new Map<string, string>();
  for (let i = 0; i < 10; i++) {
    const m = mask[i];
    const d = id[i];
    if (m === "*") continue;
    if (/\d/.test(m)) {
      if (m !== d) return false;
      continue;
    }
    const prev = map.get(m);
    if (prev === undefined) {
      const owner = used.get(d);
      if (owner !== undefined && owner !== m) return false;
      map.set(m, d);
      used.set(d, m);
    } else if (prev !== d) return false;
  }
  return true;
}

/** Регулярка для Postgres (~) с обратными ссылками. Различие букв проверяется уже в JS. */
export function maskToPgRegex(rawMask: string): string {
  const mask = normalizeMask(rawMask);
  const groups = new Map<string, number>();
  let out = "^";
  for (const ch of mask) {
    if (ch === "*") out += "[0-9]";
    else if (/\d/.test(ch)) out += ch;
    else if (groups.has(ch)) out += `\\${groups.get(ch)}`;
    else {
      groups.set(ch, groups.size + 1);
      out += "([0-9])";
    }
  }
  return out + "$";
}

/** Шаблон из ячеек поиска: код (3) + 7 ячеек, пустые = любая */
export function digitsToLike(code: string | undefined, digits: string | undefined): string | null {
  const c = (code ?? "").replace(/[^0-9_]/g, "").padEnd(3, "_").slice(0, 3);
  const d = (digits ?? "").replace(/[^0-9_]/g, "_").padEnd(7, "_").slice(0, 7);
  const like = c + d;
  return /\d/.test(like) ? like : null;
}

export function matchLike(id: string, like: string): boolean {
  for (let i = 0; i < 10; i++) if (like[i] !== "_" && like[i] !== id[i]) return false;
  return true;
}
