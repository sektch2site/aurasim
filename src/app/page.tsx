import Image from "next/image";
import { SellButton, TariffButton } from "@/components/Actions";
import { Features, TagIcon } from "@/components/Icons";
import { BundleCard } from "@/components/BundleCard";
import { Catalog } from "@/components/Catalog";
import { NumberCard } from "@/components/NumberCard";
import { OperatorDot, operatorName } from "@/components/NumberDisplay";
import { getAutoPicks, getBundles, getFeatured, getRegions, getSettings, getStats, getTariffs } from "@/lib/data";
import { formatRub } from "@/lib/pricing";

export default async function Home() {
  const [settings, featured, picks, bundles, tariffs, regions, stats] = await Promise.all([
    getSettings(),
    getFeatured(),
    getAutoPicks(24),
    getBundles(),
    getTariffs(),
    getRegions(),
    getStats(),
  ]);

  return (
    <>
      {/* HERO + поиск */}
      <section className="relative overflow-hidden">
                <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-14">
          <div className="mb-8 grid items-center gap-8 md:grid-cols-[1.25fr_1fr]">
            <div>
              <div className="mb-5 flex items-center gap-3 text-[11px] font-extrabold tracking-[0.22em] text-ink uppercase sm:text-xs">
                <span className="h-[2px] w-8 rounded bg-aura" /> {settings.hero_title} <span className="h-[2px] w-8 rounded bg-aura" />
              </div>
              <div className="relative inline-block py-6 pr-6">
                <svg viewBox="0 0 600 200" className="pointer-events-none absolute inset-0 -left-[6%] h-full w-[112%]" aria-hidden>
                  <defs>
                    <linearGradient id="orbit" x1="0" x2="1">
                      <stop offset="0" stopColor="#1a44e8" stopOpacity="0.9" />
                      <stop offset="0.55" stopColor="#5fb4ff" stopOpacity="0.7" />
                      <stop offset="1" stopColor="#1a44e8" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="300" cy="104" rx="292" ry="78" fill="none" stroke="url(#orbit)" strokeWidth="5" transform="rotate(-6 300 104)" />
                </svg>
                <span className="absolute top-1 right-8 font-display text-base font-extrabold text-ink sm:text-xl">номера РФ</span>
                <h1 className="brand-word relative text-[clamp(3rem,9vw,6.2rem)] leading-none text-ink">AURA SIM</h1>
              </div>
              <p className="mt-4 max-w-lg text-base font-medium text-ink-soft sm:text-lg">{settings.hero_subtitle}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="card-glow rounded-2xl px-4 py-3">
                  <Features />
                </div>
                <div className="card-glow flex items-center gap-2 rounded-2xl px-4 py-3 text-sm leading-tight font-extrabold">
                  <TagIcon className="h-8 w-8 text-aura" />
                  <span className="feature-bar h-9" />
                  <span>
                    Красивый номер
                    <br />
                    по <span className="text-aura">выгодной</span> цене!
                  </span>
                </div>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="absolute -inset-6 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(90,170,255,0.45),transparent)]" />
              <Image src="/brand.jpg" alt="Aura sim — номера РФ" width={640} height={640} priority className="aspect-square w-full rounded-[36px] object-cover shadow-2xl shadow-aura/30 ring-4 ring-white" />
            </div>
          </div>

          <div id="numbers" className="scroll-mt-20">
            <Catalog regions={regions} total={stats.total}>
              {featured.length > 0 && (
                <section className="mt-10">
                  <SectionTitle kicker="Подборка Aura sim" title="Номера недели" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((n, i) => (
                      <NumberCard key={n.id} n={n} hot delay={Math.min(i, 8) * 40} />
                    ))}
                  </div>
                </section>
              )}
              <section className="mt-14">
                <SectionTitle kicker="Подобрано автоматически" title="Самые красивые сегодня" note="Повторы, зеркальные номера, лесенки и пары цифр" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {picks.map((n) => (
                    <NumberCard key={n.id} n={n} />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <a href="#search" className="inline-block rounded-2xl border border-aura px-6 py-3 font-bold text-aura transition hover:bg-aura hover:text-white">
                    Искать среди всех номеров
                  </a>
                </div>
              </section>
            </Catalog>
          </div>
        </div>
      </section>

      {/* Пары и тройки */}
      {bundles.length > 0 && (
        <section id="bundles" className="mx-auto mt-16 max-w-6xl scroll-mt-20 px-4">
          <SectionTitle kicker="Для семьи и бизнеса" title="Пары и тройки номеров" note="Созвучные номера — продаём комплектом со скидкой" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b) => (
              <BundleCard key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}

      {/* Тарифы */}
      {tariffs.length > 0 && (
        <section id="tariffs" className="mx-auto mt-20 max-w-6xl scroll-mt-20 px-4">
          <SectionTitle kicker="К любому номеру" title="Выгодные тарифы" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tariffs.map((t) => (
              <article key={t.id} className="card-glow flex flex-col rounded-3xl p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
                  <OperatorDot op={t.operator} /> {operatorName(t.operator)}
                </div>
                <h3 className="font-display text-xl font-extrabold">{t.name}</h3>
                {t.description && <p className="mt-2 text-sm text-ink-soft">{t.description}</p>}
                <div className="num mt-4 text-3xl text-aura">
                  {formatRub(t.price)}
                  <span className="text-base font-semibold text-ink-soft"> / мес</span>
                </div>
                <div className="mt-auto">
                  <TariffButton name={`${operatorName(t.operator)} — ${t.name}`} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Выкуп */}
      <section id="buyback" className="mx-auto mt-20 max-w-6xl scroll-mt-20 px-4">
        <div className="aura-stripes relative overflow-hidden rounded-[32px] bg-ink p-7 text-white sm:p-12">
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <div className="mb-3 text-xs font-bold tracking-[0.22em] text-sky uppercase">Выкуп номеров</div>
              <h2 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">Есть красивый номер? Купим его у вас</h2>
              <p className="mt-4 max-w-lg text-white/70">
                Оценим за пару минут и предложим честную цену. Переоформление — при личной встрече или дистанционно.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SellButton className="rounded-2xl bg-white px-6 py-4 font-bold text-ink transition hover:bg-aura-soft" />
              <span className="text-center text-xs text-white/50">Ответим в Telegram в течение дня</span>
            </div>
          </div>
        </div>
      </section>

      {/* Как купить */}
      <section id="how" className="mx-auto mt-20 max-w-6xl scroll-mt-20 px-4">
        <SectionTitle kicker="Процесс покупки" title="Как купить номер" />
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            ["Выберите номер", "Найдите через поиск или в подборке и нажмите «Приобрести»."],
            ["Напишите нам", "Откроется Telegram с готовым сообщением — просто отправьте."],
            ["Бронь номера", "Подтвердим наличие и закрепим номер за вами."],
            ["Оформление", "Встретимся лично или оформим дистанционно. Номер ваш."],
          ].map(([t, d], i) => (
            <li key={t} className="card-glow rounded-3xl p-5">
              <div className="font-display mb-3 grid h-10 w-10 place-items-center rounded-full bg-aura-soft text-lg font-extrabold text-aura">{i + 1}</div>
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function SectionTitle({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 text-xs font-bold tracking-[0.2em] text-aura uppercase">{kicker}</div>
      <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-soft">{note}</p>}
    </div>
  );
}
