export type Operator = "beeline" | "megafon" | "mts" | "yota" | "t2" | "other";

export const OPERATORS: { id: Operator; name: string; color: string }[] = [
  { id: "beeline", name: "Билайн", color: "#FFC800" },
  { id: "megafon", name: "МегаФон", color: "#00B956" },
  { id: "mts", name: "МТС", color: "#E30611" },
  { id: "yota", name: "Yota", color: "#00AEEF" },
  { id: "t2", name: "T2", color: "#111111" },
  { id: "other", name: "Другие", color: "#7C8597" },
];

/** Номер в каталоге. id — 10 цифр без +7 (например 9610444004). */
export interface PhoneNumber {
  id: string;
  operator: Operator;
  region: string | null;
  tariff_name: string | null;
  /** абонентская плата тарифа, ₽/мес */
  tariff_price: number | null;
  /** цена из партнёрки (если есть) */
  partner_price: number | null;
  /** ручная цена из админки — приоритетнее всего */
  price_override: number | null;
  /** «было» — для зачёркнутой цены */
  price_old: number | null;
  beauty_score: number;
  /** 10 символов '0'/'1' — какие цифры подсвечивать */
  beauty_mask: string;
  tags: string[];
  is_active: boolean;
  source: "partner" | "manual";
}

export interface Bundle {
  id: string;
  kind: "pair" | "trio";
  title: string | null;
  numbers: string[];
  price: number | null;
  price_old: number | null;
  is_active: boolean;
  position: number;
}

export interface PriceRule {
  id: string;
  operator: Operator;
  /** правило действует для тарифов с абонплатой <= tariff_max (null — любой) */
  tariff_max: number | null;
  price_from: number | null;
  price_to: number | null;
  /** подпись про тариф на карточке, напр. «любой тариф» / «тариф от 500 ₽» */
  tariff_note: string | null;
}

export interface Tariff {
  id: string;
  operator: Operator;
  name: string;
  price: number;
  description: string | null;
  position: number;
}

export interface Settings {
  telegram: string;
  whatsapp: string;
  max: string;
  phone: string;
  /** наценка на цену партнёрки, % */
  markup_percent: number;
  /** до скольки рублей округлять цену */
  round_to: number;
  hero_title: string;
  hero_subtitle: string;
  /** ссылка на видео «Процесс покупки» (mp4 или страница с видео) */
  video_url: string;
  /** цена публикации номера на сайте и в канале, ₽ */
  publish_price: number;
}

export const DEFAULT_SETTINGS: Settings = {
  telegram: "emaksonnn",
  whatsapp: "",
  max: "",
  phone: "",
  markup_percent: 0,
  round_to: 500,
  hero_title: "Красивый номер для ваших целей",
  hero_subtitle: "Билайн, МегаФон, МТС, Yota и T2 — личная встреча или дистанционное оформление",
  video_url: "",
  publish_price: 750,
};

/** Логотипы операторов (файлы в public/operators). Пока файла нет — показывается цветной кружок. */
export const OPERATOR_LOGOS: Partial<Record<Operator, string>> = {
  beeline: "/operators/beeline.png",
  megafon: "/operators/megafon.png",
  yota: "/operators/yota.png",
  t2: "/operators/t2.png",
};

export type ResolvedPrice =
  | { kind: "fixed"; price: number; old: number | null }
  | { kind: "range"; from: number; to: number }
  | { kind: "request" };

export interface CatalogQuery {
  code?: string; // 3 цифры кода или пусто
  digits?: string; // 7 символов, '_' = любая
  q?: string; // свободный поиск по цифрам
  operators?: Operator[];
  mask?: string; // маска вида *****AAAA*
  tariffMin?: number;
  tariffMax?: number;
  region?: string;
  withPrice?: boolean;
  sort?: "beauty" | "price_asc" | "price_desc" | "new";
  ids?: string[];
  page?: number;
  pageSize?: number;
}

export interface CatalogItem extends PhoneNumber {
  price: ResolvedPrice;
  tariff_note: string | null;
}

export interface CatalogResult {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
}
