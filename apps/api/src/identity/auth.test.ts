import { beforeAll, describe, expect, it } from "vitest";
import { AuthenticationError } from "@soma/core";
import { AuthService, type OtpSender } from "./auth.service.js";
import { TokenService } from "./token.service.js";
import type { IdentityUser, UserRepository } from "./user.repository.js";

class FakeUserRepo implements UserRepository {
  constructor(readonly users: IdentityUser[]) {}
  async findByEmail(schoolId: string, email: string): Promise<IdentityUser | null> {
    return this.users.find((u) => u.schoolId === schoolId && u.email === email) ?? null;
  }
  async setOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void> {
    const u = this.users.find((x) => x.id === userId);
    if (u) Object.assign(u, { otpHash, otpExpiresAt: expiresAt });
  }
  async clearOtp(userId: string): Promise<void> {
    const u = this.users.find((x) => x.id === userId);
    if (u) Object.assign(u, { otpHash: null, otpExpiresAt: null });
  }
}

class CapturingOtpSender implements OtpSender {
  lastCode = "";
  async send(_email: string, code: string): Promise<void> {
    this.lastCode = code;
  }
}

const tokens = new TokenService("test-secret-at-least-32-characters!!", 900);
let repo: FakeUserRepo;
let sender: CapturingOtpSender;
let auth: AuthService;

beforeAll(async () => {
  repo = new FakeUserRepo([
    {
      id: "u1",
      schoolId: "school-a",
      email: "bursar@test.soma",
      passwordHash: await AuthService.hashPassword("correct horse battery"),
      role: "BURSAR",
      otpHash: null,
      otpExpiresAt: null,
    },
  ]);
  sender = new CapturingOtpSender();
  auth = new AuthService(repo, tokens, sender);
});

describe("password auth", () => {
  it("issues a session whose token verifies back to the same claims", async () => {
    const session = await auth.login("school-a", "bursar@test.soma", "correct horse battery");
    expect(session.expiresIn).toBe(900);
    const claims = tokens.verify(session.accessToken);
    expect(claims).toMatchObject({ sub: "u1", schoolId: "school-a", role: "BURSAR" });
  });

  it("rejects a wrong password and an unknown user identically", async () => {
    await expect(auth.login("school-a", "bursar@test.soma", "wrong")).rejects.toThrow(
      AuthenticationError,
    );
    await expect(auth.login("school-a", "ghost@test.soma", "wrong")).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("rejects a valid email scoped to the wrong tenant", async () => {
    await expect(
      auth.login("school-b", "bursar@test.soma", "correct horse battery"),
    ).rejects.toThrow(AuthenticationError);
  });
});

describe("token service", () => {
  it("rejects tampered tokens", () => {
    const good = tokens.sign({ sub: "u1", schoolId: "school-a", role: "BURSAR" });
    expect(() => tokens.verify(good + "x")).toThrow(AuthenticationError);
    const other = new TokenService("a-different-secret-32-characters!!!!", 900);
    expect(() => other.verify(good)).toThrow(AuthenticationError);
  });
});

describe("OTP auth", () => {
  it("issues a single-use OTP that grants a session once", async () => {
    await auth.requestOtp("school-a", "bursar@test.soma");
    expect(sender.lastCode).toMatch(/^\d{6}$/);

    const session = await auth.verifyOtp("school-a", "bursar@test.soma", sender.lastCode);
    expect(tokens.verify(session.accessToken).sub).toBe("u1");

    // Second use of the same code must fail.
    await expect(
      auth.verifyOtp("school-a", "bursar@test.soma", sender.lastCode),
    ).rejects.toThrow(AuthenticationError);
  });

  it("rejects a wrong code", async () => {
    await auth.requestOtp("school-a", "bursar@test.soma");
    await expect(auth.verifyOtp("school-a", "bursar@test.soma", "000000")).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("silently accepts OTP requests for unknown accounts", async () => {
    await expect(auth.requestOtp("school-a", "ghost@test.soma")).resolves.toBeUndefined();
  });
});
