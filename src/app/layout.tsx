import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BuyProvider } from "@/components/BuyProvider";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura sim — красивые номера телефонов",
  description: "Красивые номера Билайн, МегаФон, МТС, Yota и T2. Пары и тройки номеров, выгодные тарифы, выкуп номеров. Личная встреча или дистанционное оформление.",
  openGraph: {
    title: "Aura sim — красивые номера телефонов",
    description: "Красивый номер для ваших целей. Обновляем базу каждый день.",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#1c4bf0" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const tg = settings.telegram.replace(/^@/, "");
  return (
    <html lang="ru" className="h-full">
      <body className="flex min-h-full flex-col">
        <BuyProvider settings={settings}>
          <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
              <Link href="/" aria-label="Aura sim — на главную">
                <Logo />
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-soft md:flex">
                <Link href="/#numbers" className="hover:text-aura">Номера</Link>
                <Link href="/#bundles" className="hover:text-aura">Пары и тройки</Link>
                <Link href="/#tariffs" className="hover:text-aura">Тарифы</Link>
                <Link href="/#buyback" className="hover:text-aura">Выкуп</Link>
                <Link href="/#how" className="hover:text-aura">Как купить</Link>
              </nav>
              <a
                href={`https://t.me/${tg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-aura"
              >
                @{tg}
              </a>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer id="contact" className="mt-20 border-t border-line bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
              <div>
                <Logo />
                <p className="mt-3 max-w-sm text-sm text-ink-soft">
                  Красивые номера всех операторов. Личная встреча или дистанционное оформление. Скидка за быструю сделку.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#229ED9] px-4 py-2 text-white">
                  Telegram @{tg}
                </a>
                {settings.whatsapp && (
                  <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-4 py-2 text-white">
                    WhatsApp
                  </a>
                )}
                {settings.phone && (
                  <a href={`tel:${settings.phone}`} className="rounded-full border border-line px-4 py-2">
                    {settings.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="border-t border-line py-4 text-center text-xs text-mute">© Aura sim — красивые номера телефонов</div>
          </footer>
        </BuyProvider>
      </body>
    </html>
  );
}
