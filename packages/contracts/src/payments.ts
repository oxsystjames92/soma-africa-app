import { z } from "zod";

/** Payment DTOs — validated at every boundary (CLAUDE.md §9). */

export const PaymentChannelSchema = z.enum(["MTN_MOMO", "AIRTEL_MONEY"]);
export type PaymentChannel = z.infer<typeof PaymentChannelSchema>;

/** E.164, the only phone format the rails accept. */
const MsisdnSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter your number in international format, e.g. +256700123456");

/** Step 1 of the payer flow: is this payment code real? */
export const PaymentLookupSchema = z.object({
  schoolId: z.string().uuid(),
  paymentCode: z.string().min(4).max(32),
});
export type PaymentLookupRequest = z.infer<typeof PaymentLookupSchema>;

/**
 * Response carries validity and an opaque token only. Returning a student's
 * name, school, or balance here would repeat the incumbent's leak (§8.1).
 */
export const PaymentLookupResponseSchema = z.object({
  valid: z.boolean(),
  intentToken: z.string().optional(),
  expiresInSeconds: z.number().int().positive().optional(),
});
export type PaymentLookupResponse = z.infer<typeof PaymentLookupResponseSchema>;

/** Step 2: commit to an amount and trigger the debit prompt. */
export const PaymentConfirmSchema = z.object({
  intentToken: z.string().min(20),
  // Minor units as a string: JSON numbers cannot hold large bigints exactly.
  amountMinor: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => BigInt(v) > 0n, "Amount must be greater than zero"),
  payerPhone: MsisdnSchema,
  channel: PaymentChannelSchema,
});
export type PaymentConfirmRequest = z.infer<typeof PaymentConfirmSchema>;

export const PaymentConfirmResponseSchema = z.object({
  somaReference: z.string(),
  status: z.enum(["pending", "rejected"]),
});
export type PaymentConfirmResponse = z.infer<typeof PaymentConfirmResponseSchema>;

export const WebhookReplaySchema = z.object({
  deliveryId: z.string().uuid(),
});
export type WebhookReplayRequest = z.infer<typeof WebhookReplaySchema>;
