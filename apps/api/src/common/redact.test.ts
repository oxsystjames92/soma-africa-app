import { describe, expect, it } from "vitest";
import { redact } from "./redact.js";

describe("redact", () => {
  it("removes secrets and masks PII, recursively", () => {
    expect(
      redact({
        password: "hunter2",
        otp: "123456",
        authorization: "Bearer abc",
        email: "guardian@example.com",
        phone: "+256700123456",
        nested: { token: "xyz", payerPhone: "+256700999888", amount: 5000 },
      }),
    ).toEqual({
      password: "[REDACTED]",
      otp: "[REDACTED]",
      authorization: "[REDACTED]",
      email: "***.com",
      phone: "***3456",
      nested: { token: "[REDACTED]", payerPhone: "***9888", amount: 5000 },
    });
  });

  it("passes primitives and arrays through", () => {
    expect(redact([1, "a", null])).toEqual([1, "a", null]);
    expect(redact("plain")).toBe("plain");
  });
});
