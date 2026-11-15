/** Баннер над поиском: «Красивые номера — подбери свой идеальный номер» + телефон с номером */
export function HeroBanner() {
  const chips: [string, React.ReactNode][] = [
    [
      "Премиум-комбинации",
      <path key="c" d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" />,
    ],
    ["Быстрый поиск", <path key="b" d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />],
    [
      "Официально и безопасно",
      <>
        <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </>,
    ],
  ];
  return (
    <section className="relative mb-3 overflow-hidden rounded-[26px] border border-white bg-gradient-to-br from-white via-[#eaf1ff] to-[#cfe0ff] p-4 shadow-[0_10px_40px_-12px_rgba(29,78,216,0.35)] sm:p-6">
      {/* световые волны */}
      <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-aura/25 blur-3xl" />
      <div className="pointer-events-none absolute top-4 right-24 h-40 w-40 rounded-full bg-sky-300/40 blur-2xl" />

      <div className="relative mx-auto flex max-w-3xl items-center gap-3 sm:justify-between sm:gap-10 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.65rem] leading-[0.95] font-black tracking-tight text-ink italic sm:text-[3.6rem]">
            Красивые
            <br />
            <span className="text-aura">номера</span>
          </h1>
          <p className="mt-1.5 text-[11px] font-bold text-ink sm:text-lg">Подбери свой идеальный номер</p>
          <div className="mt-2.5 flex gap-1.5 sm:mt-4 sm:gap-2.5">
            {chips.map(([label, icon]) => (
              <div
                key={label}
                className="flex w-[4.6rem] flex-col sm:w-32 items-center gap-1 rounded-xl border border-white bg-white/80 px-1 py-1.5 text-center shadow-sm backdrop-blur sm:w-28 sm:py-2.5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-aura sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
                <span className="text-[8.5px] leading-tight font-bold text-ink sm:text-[11px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* телефон */}
        <div className="relative w-[32%] max-w-[13rem] shrink-0 -rotate-[8deg] sm:w-44">
          <div className="rounded-[1.7rem] bg-gradient-to-b from-slate-300 to-slate-500 p-[3px] shadow-[0_20px_40px_-10px_rgba(15,40,120,0.55)]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[1.55rem] bg-gradient-to-b from-[#0b1b4d] via-[#10287a] to-[#081235]">
              <div className="absolute top-1.5 left-1/2 h-2.5 w-10 -translate-x-1/2 rounded-full bg-black/80" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(96,165,250,0.45),transparent_60%)]" />
              <div className="relative flex h-full flex-col items-center justify-center px-1.5 text-center">
                <div className="text-[8px] font-extrabold tracking-[0.15em] text-white/80 italic sm:text-[10px]">AURA SIM</div>
                <div className="num mt-1 text-[11px] leading-tight font-black whitespace-nowrap text-white sm:text-base">+7 977 777 77 77</div>
                <div className="mt-[22%] flex gap-[18%]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 sm:h-8 sm:w-8">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-white sm:h-4 sm:w-4" fill="currentColor">
                      <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                    </svg>
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 sm:h-8 sm:w-8">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 rotate-[135deg] text-white sm:h-4 sm:w-4" fill="currentColor">
                      <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
