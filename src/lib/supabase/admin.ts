import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./env";

/** Сервисный клиент — только на сервере, обходит RLS */
export function serviceClient() {
  if (!SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
