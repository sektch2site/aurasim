import { PublishButton, VideoButton } from "@/components/Actions";
import { Catalog } from "@/components/Catalog";
import { Features } from "@/components/Icons";
import { NumberCard } from "@/components/NumberCard";
import { getFeatured, getSettings, getTopNumbers } from "@/lib/data";
import { formatRub } from "@/lib/pricing";

export default async function Home() {
  const [settings, featured, top] = await Promise.all([getSettings(), getFeatured(), getTopNumbers(30)]);

  return (
    <div className="mx-auto max-w-4xl px-3 pt-3 sm:px-4 sm:pt-5">
      {/* короткая шапка: слоган + плашки сбоку */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-ink uppercase sm:text-[11px]">
          <span className="h-[2px] w-5 rounded bg-aura" /> {settings.hero_title}
        </div>
        <Features compact />
      </div>

      <div id="numbers">
        <Catalog
          initial={top}
          featured={
            featured.length > 0 ? (
              <section className="mt-6">
                <div className="mb-2.5 flex items-end justify-between px-1">
                  <div>
                    <div className="text-[10px] font-extrabold tracking-[0.2em] text-aura uppercase">Подборка Aura sim</div>
                    <h2 className="font-display text-lg font-extrabold sm:text-xl">Номера недели</h2>
                  </div>
                  <span className="text-xs font-semibold text-ink-soft">листайте →</span>
                </div>
                <div className="no-scrollbar -mx-3 grid snap-x snap-mandatory auto-cols-[calc((100%-1rem)/2.15)] grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:auto-cols-[calc((100%-1.5rem)/3)] sm:gap-3 sm:px-0">
                  {featured.map((n, i) => (
                    <NumberCard key={n.id} n={n} delay={Math.min(i, 6) * 40} />
                  ))}
                </div>
              </section>
            ) : null
          }
        />
      </div>

      {/* Публикация номера */}
      <section id="publish" className="mt-10 scroll-mt-20">
        <div className="aura-card relative overflow-hidden rounded-[26px] p-5 text-white sm:p-7">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-extrabold tracking-[0.2em] text-white/70 uppercase">Публикация номера</div>
              <h2 className="font-display mt-1 text-xl leading-tight font-extrabold sm:text-2xl">Продаёте красивый номер? Разместим на сайте и в канале</h2>
              <p className="mt-1.5 text-sm text-white/80">
                Любой номер — всего за <b className="text-white">{formatRub(settings.publish_price)}</b>
              </p>
            </div>
            <PublishButton className="shrink-0 rounded-2xl bg-white px-5 py-3 font-extrabold text-aura shadow-lg shadow-black/10 transition hover:bg-aura-soft active:scale-95" />
          </div>
        </div>
      </section>

      {/* Как купить */}
      <section id="how" className="mt-10 scroll-mt-20">
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="font-display text-lg font-extrabold sm:text-xl">Как купить номер</h2>
          {settings.video_url && <VideoButton className="rounded-full bg-aura px-3.5 py-1.5 text-xs font-bold text-white">▶ Смотреть видео</VideoButton>}
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Выберите номер", "Через поиск или в подборке"],
            ["Напишите нам", "Откроется Telegram с готовым сообщением"],
            ["Бронь", "Подтвердим и закрепим номер за вами"],
            ["Оформление", "Лично или дистанционно"],
          ].map(([t, d], i) => (
            <li key={t} className="card-glow rounded-2xl p-3.5">
              <div className="font-display mb-1.5 grid h-7 w-7 place-items-center rounded-full bg-aura text-sm font-extrabold text-white">{i + 1}</div>
              <h3 className="text-sm font-extrabold">{t}</h3>
              <p className="mt-0.5 text-xs text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
