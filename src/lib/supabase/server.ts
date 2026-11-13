import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_EMAILS, SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./env";

export async function sessionClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // вызвано из Server Component — cookies обновит proxy
        }
      },
    },
  });
}

/** Текущий админ или null */
export async function getAdmin(): Promise<{ email: string } | null> {
  if (!hasSupabase) return null;
  const sb = await sessionClient();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  // без списка ADMIN_EMAILS в админку не пускаем никого
  if (!ADMIN_EMAILS.includes(email)) return null;
  return { email };
}
