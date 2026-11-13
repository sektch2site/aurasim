import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { hasSupabase } from "@/lib/supabase/env";
import { signIn } from "../actions";

export const metadata = { title: "Вход — Aura sim", robots: { index: false } };

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="card-glow rounded-3xl p-7">
        <Logo />
        <h1 className="font-display mt-6 mb-5 text-xl font-extrabold">Вход в админку</h1>
        {!hasSupabase ? (
          <p className="text-sm text-ink-soft">База ещё не подключена — сайт работает на тестовых данных.</p>
        ) : (
          <form action={signIn} className="space-y-3">
            <Suspense>
              <LoginError searchParams={props.searchParams} />
            </Suspense>
            <input name="email" type="email" required placeholder="Почта" className="h-12 w-full rounded-xl border border-line px-4 outline-none focus:border-aura" />
            <input name="password" type="password" required placeholder="Пароль" className="h-12 w-full rounded-xl border border-line px-4 outline-none focus:border-aura" />
            <button className="h-12 w-full rounded-2xl bg-aura font-bold text-white hover:bg-aura-deep">Войти</button>
          </form>
        )}
      </div>
    </div>
  );
}

async function LoginError({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const err = (await searchParams).err;
  return err ? <div className="rounded-xl bg-fire/10 p-3 text-sm text-fire">{String(err)}</div> : null;
}
