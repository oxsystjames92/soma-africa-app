import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Integration tests need DATABASE_URL; unit tests ignore it.
config({ path: "../../packages/db/.env" });

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
