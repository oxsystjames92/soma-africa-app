import type { SomaPrismaClient } from "@soma/db";
import type { NotificationChannel, ReminderChannelName } from "./notification-channel.js";

/** Channels a parent receives unless they say otherwise. */
const DEFAULT_ENABLED: Record<ReminderChannelName, boolean> = {
  SMS: true,
  WHATSAPP: true,
  // Email is off by default: schools rarely hold a verified parent address,
  // and messaging an unverified one is a disclosure risk.
  EMAIL: false,
};

/** No parent receives more than this many reminders in the window. */
export const RATE_LIMIT_COUNT = 3;
export const RATE_LIMIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReminderRequest {
  identityId: string;
  schoolId: string;
  studentId: string;
  channel: ReminderChannelName;
  kind: string;
  body: string;
}

export type ReminderResult = "SENT" | "FAILED" | "SUPPRESSED_OPT_OUT" | "SUPPRESSED_RATE_LIMIT";

/**
 * Fee reminders (CLAUDE.md §7 F11).
 *
 * Three rules are absolute here. An opt-out is honoured before anything else
 * happens. A parent cannot be messaged more than a few times a week however
 * many children or schools are involved — the limit is per person, because
 * being messaged is a per-person experience. And no message body, phone, or
 * child name is ever written to a log or a database column.
 */
export class ReminderService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly channels: Map<ReminderChannelName, NotificationChannel>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async send(request: ReminderRequest): Promise<ReminderResult> {
    if (!(await this.isEnabled(request.identityId, request.channel))) {
      return this.record(request, "SUPPRESSED_OPT_OUT", "Parent opted out of this channel");
    }

    if (await this.isRateLimited(request.identityId)) {
      return this.record(
        request,
        "SUPPRESSED_RATE_LIMIT",
        `Already sent ${RATE_LIMIT_COUNT} reminders in the window`,
      );
    }

    const channel = this.channels.get(request.channel);
    const destination = await this.destinationFor(request.identityId, request.channel);
    if (!channel || !destination) {
      return this.record(request, "FAILED", "No configured channel or destination");
    }

    try {
      await channel.send({ to: destination, body: request.body });
      return this.record(request, "SENT", null);
    } catch (err) {
      return this.record(request, "FAILED", err instanceof Error ? err.name : "send error");
    }
  }

  /** Read a parent's channel settings, filling in defaults. */
  async preferences(identityId: string): Promise<Record<ReminderChannelName, boolean>> {
    const rows = await this.prisma.reminderPreference.findMany({ where: { identityId } });
    const result = { ...DEFAULT_ENABLED };
    for (const row of rows) {
      result[row.channel as ReminderChannelName] = row.enabled;
    }
    return result;
  }

  /** Opt in or out. An explicit choice always beats the default. */
  async setPreference(
    identityId: string,
    channel: ReminderChannelName,
    enabled: boolean,
  ): Promise<void> {
    await this.prisma.reminderPreference.upsert({
      where: { identityId_channel: { identityId, channel } },
      update: { enabled },
      create: { identityId, channel, enabled },
    });
  }

  /** One switch that silences every channel. */
  async optOutOfEverything(identityId: string): Promise<void> {
    for (const channel of ["SMS", "WHATSAPP", "EMAIL"] as const) {
      await this.setPreference(identityId, channel, false);
    }
  }

  private async isEnabled(identityId: string, channel: ReminderChannelName): Promise<boolean> {
    const explicit = await this.prisma.reminderPreference.findUnique({
      where: { identityId_channel: { identityId, channel } },
    });
    return explicit ? explicit.enabled : DEFAULT_ENABLED[channel];
  }

  private async isRateLimited(identityId: string): Promise<boolean> {
    const since = new Date(this.now().getTime() - RATE_LIMIT_WINDOW_MS);
    const sent = await this.prisma.reminderLog.count({
      // Only actual sends count. Suppressions must not consume the allowance,
      // or a rate-limited parent could never be reached again.
      where: { identityId, status: "SENT", createdAt: { gte: since } },
    });
    return sent >= RATE_LIMIT_COUNT;
  }

  private async destinationFor(
    identityId: string,
    channel: ReminderChannelName,
  ): Promise<string | null> {
    const identity = await this.prisma.guardianIdentity.findUnique({
      where: { id: identityId },
      select: { phone: true, guardians: { select: { email: true }, take: 1 } },
    });
    if (!identity) return null;
    if (channel === "EMAIL") return identity.guardians[0]?.email ?? null;
    return identity.phone;
  }

  /**
   * Record every outcome, including suppressions. Proving a parent was NOT
   * messaged after opting out is exactly what this table is for.
   */
  private async record(
    request: ReminderRequest,
    status: ReminderResult,
    detail: string | null,
  ): Promise<ReminderResult> {
    await this.prisma.reminderLog.create({
      data: {
        identityId: request.identityId,
        schoolId: request.schoolId,
        studentId: request.studentId,
        channel: request.channel,
        kind: request.kind,
        status,
        // Never the body: it names a child and states what they owe.
        detail,
        // Written from the service clock, not the database's. The rate-limit
        // window is computed from the same clock, and a limit measured
        // against timestamps the service never saw is not a limit.
        createdAt: this.now(),
      },
    });
    return status;
  }
}
