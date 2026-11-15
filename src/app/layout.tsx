import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { VideoButton } from "@/components/Actions";
import { BuyProvider } from "@/components/BuyProvider";
import { FavoritesProvider } from "@/components/Favorites";
import { Logo } from "@/components/Logo";
import { DesktopNav, TabBar } from "@/components/TabBar";
import { getSettings } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura sim — красивые номера телефонов",
  description: "Красивые номера Билайн, МегаФон, МТС, Yota и T2. Пары и тройки номеров. Личная встреча или дистанционное оформление.",
  openGraph: {
    title: "Aura sim — красивые номера телефонов",
    description: "Красивый номер для ваших целей. Обновляем базу каждый день.",
    locale: "ru_RU",
    type: "website",
    images: ["/brand.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#1a44e8" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const tg = settings.telegram.replace(/^@/, "");
  return (
    <html lang="ru" className="h-full">
      <body className="flex min-h-full flex-col">
        <div id="aura-loader" aria-hidden="true" suppressHydrationWarning>
          <div className="flex flex-col items-center gap-3">
            <div className="aura-spin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand.jpg" alt="" />
            </div>
            <div className="font-display text-lg font-extrabold text-aura italic">Aura sim</div>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var h=function(){var l=document.getElementById('aura-loader');if(l)l.classList.add('done')};if(document.readyState==='complete')setTimeout(h,150);else window.addEventListener('load',function(){setTimeout(h,150)});setTimeout(h,4000)})();",
          }}
        />
        <FavoritesProvider>
          <BuyProvider settings={settings}>
            <header className="sticky top-0 z-40 border-b border-line/60 bg-white/80 backdrop-blur-md">
              <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
                <Link href="/" aria-label="Aura sim — на главную">
                  <Logo />
                </Link>
                <DesktopNav />
                <div className="ml-auto flex items-center gap-2">
                  {settings.video_url && (
                    <VideoButton className="hidden rounded-full border border-aura/30 px-3 py-1.5 text-xs font-bold text-aura hover:bg-aura-soft sm:block">▶ Процесс покупки</VideoButton>
                  )}
                  <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-aura">
                    @{tg}
                  </a>
                </div>
              </div>
            </header>
            <main className="flex-1 pb-28 md:pb-0">{children}</main>
            <footer id="contact" className="mt-16 hidden border-t border-line bg-white md:block">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-8">
                <div>
                  <Logo />
                  <p className="mt-2 max-w-sm text-sm text-ink-soft">Красивые номера всех операторов. Личная встреча или дистанционное оформление.</p>
                </div>
                <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white">
                  Telegram @{tg}
                </a>
              </div>
            </footer>
            <TabBar />
          </BuyProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
