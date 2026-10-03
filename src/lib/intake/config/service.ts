import { getSupabase } from "@/lib/intake/db/client";
import { DEFAULT_CONFIG } from "./defaults";
import { AppConfigSchema, type AppConfig } from "./schema";

// Loads the live app config from Supabase (`app_config` table, single row id=1),
// validates it, and falls back to the seeded DEFAULT_CONFIG when the DB is
// unavailable or empty. A short in-process cache avoids re-fetching per request.

const CONFIG_ROW_ID = 1;
let memo: { value: AppConfig; at: number } | null = null;
const TTL_MS = 15_000;

export async function getConfig(force = false): Promise<AppConfig> {
  if (!force && memo && Date.now() - memo.at < TTL_MS) return memo.value;

  const db = getSupabase();
  if (!db) {
    const parsed = AppConfigSchema.parse(DEFAULT_CONFIG);
    memo = { value: parsed, at: Date.now() };
    return parsed;
  }

  const { data, error } = await db
    .from("app_config")
    .select("config")
    .eq("id", CONFIG_ROW_ID)
    .maybeSingle();

  if (error || !data?.config) {
    const parsed = AppConfigSchema.parse(DEFAULT_CONFIG);
    memo = { value: parsed, at: Date.now() };
    return parsed;
  }

  const result = AppConfigSchema.safeParse(data.config);
  const value = result.success ? result.data : AppConfigSchema.parse(DEFAULT_CONFIG);
  memo = { value, at: Date.now() };
  return value;
}

export async function saveConfig(next: AppConfig): Promise<AppConfig> {
  const parsed = AppConfigSchema.parse(next);
  const db = getSupabase();
  if (!db) throw new Error("Cannot save config: Supabase is not configured.");
  const { error } = await db
    .from("app_config")
    .upsert({ id: CONFIG_ROW_ID, config: parsed, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save config: ${error.message}`);
  memo = { value: parsed, at: Date.now() };
  return parsed;
}

/** Seed the config row if it doesn't exist yet. Safe to call repeatedly. */
export async function seedConfigIfEmpty(): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { data } = await db
    .from("app_config")
    .select("id")
    .eq("id", CONFIG_ROW_ID)
    .maybeSingle();
  if (!data) {
    await db.from("app_config").insert({
      id: CONFIG_ROW_ID,
      config: AppConfigSchema.parse(DEFAULT_CONFIG),
    });
  }
}

export function getDefaultConfig(): AppConfig {
  return AppConfigSchema.parse(DEFAULT_CONFIG);
}
