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

/** Маски, для которых в базе заранее проставлен тег (быстрый поиск): популярные + служебные */
export const TAGGED_MASKS = [...POPULAR_MASKS, "***ABABAB*"];

export function normalizeMask(mask: string): string {
  const m = mask.toUpperCase().replace(/[^0-9A-Z*]/g, "").slice(0, 10);
  return m.padStart(10, "*");
}

export function matchMask(id: string, rawMask: string): boolean {
  const mask = normalizeMask(rawMask);
  const map = new Map<string, string>();
  const used = new Map<string, string>();
  // буква не может совпадать с цифрой, написанной в маске явно (A0A0 — не 0000)
  for (const ch of mask) if (/\d/.test(ch)) used.set(ch, "#");
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
    else if (/\d/.test(ch)) out += `[${ch}]`; // в скобках, чтобы не склеилось с обратной ссылкой (\1 0 → \10)
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

/**
 * Маска → условия для базы без регулярок (быстро на 400+ тыс. номеров):
 * like — известные цифры, eq — позиции с одной буквой равны, neq — разные буквы различны
 * (и буква не равна цифре, написанной в маске явно: "i:=d"). Позиции с 1.
 */
export function maskConstraints(rawMask: string): { like: string | null; eq: string[]; neq: string[] } {
  const mask = normalizeMask(rawMask);
  const first = new Map<string, number>();
  const eq: string[] = [];
  const digits = new Set<string>();
  let like = "";
  for (let i = 0; i < 10; i++) {
    const ch = mask[i];
    if (/\d/.test(ch)) {
      like += ch;
      digits.add(ch);
    } else {
      like += "_";
      if (/[A-Z]/.test(ch)) {
        if (first.has(ch)) eq.push(`${first.get(ch)! + 1}:${i + 1}`);
        else first.set(ch, i);
      }
    }
  }
  const letters = [...first.entries()];
  const neq: string[] = [];
  for (let a = 0; a < letters.length; a++) {
    for (let b = a + 1; b < letters.length; b++) neq.push(`${letters[a][1] + 1}:${letters[b][1] + 1}`);
    for (const d of digits) neq.push(`${letters[a][1] + 1}:=${d}`);
  }
  return { like: /\d/.test(like) ? like : null, eq, neq };
}
