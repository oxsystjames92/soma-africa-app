import { Logger } from "@nestjs/common";

/**
 * Delivery channels behind one interface, matching how payment rails are
 * handled: adding SMS or WhatsApp is a new adapter, not a change to the
 * reminder logic.
 */
export type ReminderChannelName = "SMS" | "WHATSAPP" | "EMAIL";

export interface OutboundMessage {
  /** Phone in E.164 or an email address, depending on the channel. */
  to: string;
  body: string;
}

export interface NotificationChannel {
  readonly channel: ReminderChannelName;
  send(message: OutboundMessage): Promise<void>;
}

/** Masks a destination for logging. Never log a full phone or email (§8.7). */
export function maskDestination(to: string): string {
  if (to.includes("@")) {
    const [local, domain] = to.split("@");
    return `${local!.slice(0, 1)}***@${domain ?? ""}`;
  }
  return `***${to.slice(-4)}`;
}

/**
 * M3 delivery stub. Records that a send happened without ever writing the
 * message body — a fee reminder names a child and states what they owe.
 */
export class LoggingChannel implements NotificationChannel {
  private readonly logger = new Logger("reminders");

  constructor(readonly channel: ReminderChannelName) {}

  async send(message: OutboundMessage): Promise<void> {
    this.logger.log(
      JSON.stringify({
        channel: this.channel,
        to: maskDestination(message.to),
        bytes: message.body.length,
      }),
    );
  }
}
