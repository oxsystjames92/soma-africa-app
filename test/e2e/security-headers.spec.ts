import { expect, test } from "@playwright/test";

/** The security baseline is a hard rule (CLAUDE.md §8.8) — assert it end to end. */
test("every response carries the security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();

  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  // Fingerprinting surface removed.
  expect(headers["x-powered-by"]).toBeUndefined();
});
