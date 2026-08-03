import { z } from "zod";
import { PaymentChannelSchema } from "./payments.js";

/** Parent app DTOs (CLAUDE.md §7 F11). */

const MsisdnSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter your number in international format, e.g. +256700123456");

export const ParentOtpRequestSchema = z.object({ phone: MsisdnSchema });
export type ParentOtpRequest = z.infer<typeof ParentOtpRequestSchema>;

export const ParentOtpVerifySchema = z.object({
  phone: MsisdnSchema,
  code: z.string().regex(/^\d{6}$/),
});
export type ParentOtpVerify = z.infer<typeof ParentOtpVerifySchema>;

export const ParentPaySchema = z.object({
  studentId: z.string().uuid(),
  // Minor units as a string: JSON numbers cannot hold large bigints exactly.
  amountMinor: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => BigInt(v) > 0n, "Amount must be greater than zero"),
  payerPhone: MsisdnSchema,
  channel: PaymentChannelSchema,
});
export type ParentPayRequest = z.infer<typeof ParentPaySchema>;

export const PayerProfileSchema = z.object({
  label: z.string().min(1).max(40),
  msisdn: MsisdnSchema,
  channel: PaymentChannelSchema,
  isDefault: z.boolean().default(false),
});
export type PayerProfileRequest = z.infer<typeof PayerProfileSchema>;

export const ReminderChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL"]);
export type ReminderChannel = z.infer<typeof ReminderChannelSchema>;

export const ReminderPreferenceSchema = z.object({
  channel: ReminderChannelSchema,
  enabled: z.boolean(),
});
export type ReminderPreferenceRequest = z.infer<typeof ReminderPreferenceSchema>;
