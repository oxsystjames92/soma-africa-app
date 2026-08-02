import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config(); // load packages/db/.env so DATABASE_URL reaches the test process

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
