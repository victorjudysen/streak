// Which environment variables each part of the app needs. Pages use this to show
// a clear setup message instead of crashing when something has not been added yet.

const REQUIRED = {
  app: ["APP_PASSWORD", "SESSION_SECRET"],
  database: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
} as const;

export type ConfigArea = keyof typeof REQUIRED;

export function missingEnv(area: ConfigArea): string[] {
  return REQUIRED[area].filter((name) => !process.env[name]);
}

export function isConfigured(area: ConfigArea): boolean {
  return missingEnv(area).length === 0;
}
