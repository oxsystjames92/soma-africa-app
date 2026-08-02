import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5434/soma",
  JWT_SECRET: "x".repeat(64),
};

describe("loadEnv", () => {
  it("parses a valid environment with defaults", () => {
    const env = loadEnv(valid);
    expect(env.API_PORT).toBe(4000);
    expect(env.JWT_EXPIRES_IN).toBe("15m");
  });

  it("rejects a short JWT secret", () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: "weak" })).toThrow(/32 chars/);
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => loadEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });
});
