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

  // ─── Payment rails ───────────────────────────────────────────────────────
  // Optional so the API boots without them; a rail without credentials is
  // simply not registered rather than half-configured.
  // "partner" settles through a licensed aggregator. "direct" requires Soma
  // to hold its own PSP licence and is refused by the adapters until then.
  RAIL_MODE: z.enum(["partner", "direct"]).default("partner"),

  MTN_MOMO_BASE_URL: z.string().url().optional(),
  MTN_MOMO_SUBSCRIPTION_KEY: z.string().optional(),
  MTN_MOMO_API_USER: z.string().optional(),
  MTN_MOMO_API_KEY: z.string().optional(),
  MTN_MOMO_CALLBACK_SECRET: z.string().min(16).optional(),
  MTN_MOMO_TARGET_ENVIRONMENT: z.string().default("sandbox"),

  AIRTEL_BASE_URL: z.string().url().optional(),
  AIRTEL_CLIENT_ID: z.string().optional(),
  AIRTEL_CLIENT_SECRET: z.string().optional(),
  AIRTEL_CALLBACK_SECRET: z.string().min(16).optional(),
  AIRTEL_COUNTRY: z.string().length(2).default("UG"),
  AIRTEL_CURRENCY: z.string().length(3).default("UGX"),
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

/**
 * Feature flags — Phase-2+ features merge dark behind these (CLAUDE.md §9).
 *
 * Financing and savings are regulated products requiring a licensed lending
 * or deposit-taking partner (§2.1, Phase 2). These default to false and the
 * seams behind them throw when called, so shipping the code is not the same
 * as offering the product. Turning one on is a deliberate act that should
 * accompany a partner agreement, never a config tidy-up.
 */
export const featureFlags = {
  /** Fee instalments / BNPL. Requires a licensed lending partner. */
  financing: process.env["FEATURE_FINANCING"] === "true",
  /** Fees-savings products. Requires a licensed deposit-taking partner. */
  savings: process.env["FEATURE_SAVINGS"] === "true",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
