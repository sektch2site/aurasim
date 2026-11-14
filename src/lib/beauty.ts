/**
 * Анализ «красоты» номера. Работает с 10 цифрами без +7 (напр. 9610444004).
 * Возвращает балл (0–100), маску подсветки и теги.
 */

export interface BeautyResult {
  score: number;
  /** 10 символов '0'/'1' */
  mask: string;
  tags: string[];
}

interface Hit {
  from: number;
  to: number; // включительно
  weight: number;
  tag: string;
}

const RUN_W = [0, 0, 0, 10, 24, 48, 80, 110, 130, 150, 170];
const SEQ_W = [0, 0, 0, 0, 8, 20, 40, 70, 85, 95, 100];
const PAL_W = [0, 0, 0, 0, 6, 11, 18, 30, 40, 50, 60];

function runs(s: string, hits: Hit[]) {
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[i]) j++;
    const len = j - i + 1;
    if (len >= 3) {
      let w = RUN_W[len];
      if (s[i] === "0") w = Math.round(w * 1.15);
      // в коде (первые 3 цифры) повтор ценится меньше
      if (j < 3) w = Math.round(w * 0.4);
      hits.push({ from: i, to: j, weight: w, tag: len >= 4 ? `${len} одинаковых` : "Тройка цифр" });
    }
    i = j + 1;
  }
}

/** ABAB, ABABAB … */
function alternations(s: string, hits: Hit[]) {
  for (let i = 0; i + 3 < s.length; i++) {
    const a = s[i];
    const b = s[i + 1];
    if (a === b) continue;
    let j = i + 1;
    while (j + 1 < s.length && s[j + 1] === s[j - 1]) j++;
    const len = j - i + 1;
    if (len >= 4) {
      const w = len >= 6 ? 36 : len === 5 ? 18 : 12;
      hits.push({ from: i, to: j, weight: w, tag: "ABAB" });
      i = j - 1;
    }
  }
}

/** AABB, AABBCC */
function doubles(s: string, hits: Hit[]) {
  for (let i = 3; i + 3 < s.length; i++) {
    let j = i;
    let pairs = 0;
    while (j + 1 < s.length && s[j] === s[j + 1] && (pairs === 0 || s[j] !== s[j - 1])) {
      pairs++;
      j += 2;
    }
    if (pairs >= 2) {
      hits.push({ from: i, to: j - 1, weight: pairs >= 3 ? 16 : 6, tag: "Пары цифр" });
      i = j - 2;
    }
  }
}

/** Лесенки 1234 / 6543 */
function sequences(s: string, hits: Hit[]) {
  for (const step of [1, -1]) {
    let i = 0;
    while (i < s.length - 1) {
      let j = i;
      while (j + 1 < s.length && Number(s[j + 1]) - Number(s[j]) === step) j++;
      const len = j - i + 1;
      if (len >= 4) hits.push({ from: i, to: j, weight: SEQ_W[len], tag: "Лесенка" });
      i = j > i ? j : i + 1;
    }
  }
}

/** Зеркальные фрагменты (0440, 04440, 1234321) — только не из одной цифры */
function palindromes(s: string, hits: Hit[]) {
  for (let len = 7; len >= 4; len--) {
    for (let i = 0; i + len <= s.length; i++) {
      const seg = s.slice(i, i + len);
      if (new Set(seg).size < 2) continue;
      if (seg !== [...seg].reverse().join("")) continue;
      if (i + len <= 3) continue;
      const covered = hits.some((h) => h.tag === "Зеркальный" && h.from <= i && h.to >= i + len - 1);
      if (covered) continue;
      hits.push({ from: i, to: i + len - 1, weight: PAL_W[len], tag: "Зеркальный" });
    }
  }
}

/** Повтор блока XYZXYZ / XYXY уже покрыт; здесь — блок из 3 цифр дважды подряд */
function blocks(s: string, hits: Hit[]) {
  for (let i = 3; i + 6 <= s.length; i++) {
    const a = s.slice(i, i + 3);
    if (a === s.slice(i + 3, i + 6) && new Set(a).size > 1) {
      hits.push({ from: i, to: i + 5, weight: 26, tag: "Повтор блока" });
    }
  }
}

export function analyzeBeauty(raw: string): BeautyResult {
  const s = raw.replace(/\D/g, "").slice(-10);
  if (s.length !== 10) return { score: 0, mask: "0".repeat(10), tags: [] };

  const hits: Hit[] = [];
  runs(s, hits);
  alternations(s, hits);
  doubles(s, hits);
  sequences(s, hits);
  palindromes(s, hits);
  blocks(s, hits);

  const body = s.slice(3);
  const distinct = new Set(body).size;
  let bonus = 0;
  const tags = new Set<string>();
  if (distinct <= 2) {
    bonus += 35;
    tags.add("2 цифры");
  } else if (distinct === 3) {
    bonus += 12;
  }
  // код повторяется в номере (930 933…, 909 909…)
  const code = s.slice(0, 3);
  if (body.includes(code)) {
    bonus += 8;
  }
  // красивое окончание (последние 4 цифры)
  const tail = s.slice(6);
  if (/^(\d)\1\1\1$/.test(tail)) bonus += 10;

  let score = bonus;
  const mask = Array(10).fill("0");
  let codeJoined = false;
  for (const h of hits) {
    score += h.weight;
    if (h.weight < 6) continue;
    // узор только внутри кода (999…) не подсвечиваем
    if (h.to < 3) continue;
    const isRun = h.tag.includes("одинаков") || h.tag === "Тройка цифр";
    // в код заходит только повтор одной цифры (977 7…), остальные узоры — с 4-й цифры
    const from = isRun ? h.from : Math.max(h.from, 3);
    for (let k = from; k <= h.to; k++) mask[k] = "1";
    if (isRun && h.from < 3) codeJoined = true;
    tags.add(h.tag);
  }
  // код перекликается с парой на конце (960 … 60 60) — код тоже часть узора
  if (/^(\d)(?!\1)(\d)\1\2$/.test(tail)) {
    const pair = tail.slice(2);
    if (s.slice(1, 3) === pair || s.slice(0, 2) === pair) codeJoined = true;
  }
  // узор начинается в коде (977 7…, 9777777…) — подсвечиваем код целиком
  if (codeJoined) for (let k = 0; k < 3; k++) mask[k] = "1";
  // номер после кода собран всего из двух цифр (112 12 12, 665 65 65) — подсвечиваем его целиком
  if (distinct <= 2) for (let k = 3; k < 10; k++) mask[k] = "1";
  // одиночная «дырка» между подсвеченными цифрами (999 9[2]2 42 42) — закрашиваем, чтобы узор читался целиком
  for (let k = 1; k < 9; k++) if (mask[k] === "0" && mask[k - 1] === "1" && mask[k + 1] === "1") mask[k] = "1";

  return { score: Math.min(100, Math.round(score)), mask: mask.join(""), tags: [...tags] };
}


export function formatNumber(id: string): string {
  return `+7 ${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6, 8)} ${id.slice(8, 10)}`;
}

export function formatNumberDash(id: string): string {
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 8)}-${id.slice(8, 10)}`;
}
