import { SellButton, TariffButton } from "@/components/Actions";
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
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_15%_0%,#cfe2ff_0%,transparent_60%),radial-gradient(40%_50%_at_95%_10%,#d9f0ff_0%,transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-14">
          <div className="mb-8 max-w-3xl">
            <div className="mb-4 flex items-center gap-3 text-xs font-bold tracking-[0.22em] text-ink-soft uppercase">
              <span className="h-px w-8 bg-ink-soft/50" /> {settings.hero_title}
            </div>
            <h1 className="font-display text-[clamp(2rem,5.4vw,3.9rem)] leading-[1.02] font-extrabold tracking-tight">
              Номер, который <span className="text-aura">запоминают</span> с первого раза
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-soft sm:text-lg">{settings.hero_subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              {["👥 Личная встреча", "💻 Дистанционное оформление", "🏷️ Скидка за быструю сделку"].map((t) => (
                <span key={t} className="rounded-full border border-line bg-white/80 px-3.5 py-1.5">
                  {t}
                </span>
              ))}
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
                <h3 className="font-display text-xl font-bold">{t.name}</h3>
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
              <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">Есть красивый номер? Купим его у вас</h2>
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
              <div className="font-display mb-3 grid h-10 w-10 place-items-center rounded-full bg-aura-soft text-lg font-bold text-aura">{i + 1}</div>
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
      <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-soft">{note}</p>}
    </div>
  );
}
