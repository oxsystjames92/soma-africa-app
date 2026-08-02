import { z } from "zod";

/** Auth DTOs — validated at every boundary (CLAUDE.md §9). */

export const RoleSchema = z.enum(["OWNER", "BURSAR", "TEACHER", "VIEWER", "PARENT"]);
export type Role = z.infer<typeof RoleSchema>;

export const LoginRequestSchema = z.object({
  schoolId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const OtpRequestSchema = z.object({
  schoolId: z.string().min(1),
  email: z.string().email(),
});
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  schoolId: z.string().min(1),
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

/** JWT claims for a short-lived session. Contains NO PII beyond the user id. */
export const SessionClaimsSchema = z.object({
  sub: z.string(),
  schoolId: z.string(),
  role: RoleSchema,
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

export const SessionResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
