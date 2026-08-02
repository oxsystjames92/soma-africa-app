import { z } from "zod";

/** Environment contract. Secrets come from env ONLY (CLAUDE.md §8.9). */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 chars — generate with: openssl rand -hex 32"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${issues.join("\n  ")}`);
  }
  return parsed.data;
}

/** Feature flags — Phase-2+ features merge dark behind these (CLAUDE.md §9). */
export const featureFlags = {
  financing: false,
  savings: false,
} as const;
