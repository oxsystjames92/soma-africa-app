/**
 * The parent API client.
 *
 * Every call goes through the same REST surface a native mobile client would
 * use — the web app is one consumer, not a privileged one. The session token
 * travels in the Authorization header, never in a URL (CLAUDE.md §8.2).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "soma.parent.session";

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, body.message ?? "Something went wrong. Try again.");
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface Child {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  schoolId: string;
  schoolName: string;
  currency: string;
  outstandingMinor: string;
}

export interface PaymentRecord {
  somaReference: string;
  receiptNo: string | null;
  status: string;
  amountMinor: string;
  currency: string;
  paidAt: string | null;
  childName: string;
  schoolName: string;
}

export const api = {
  requestCode: (phone: string) =>
    call<{ ok: true }>("/parent/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyCode: (phone: string, code: string) =>
    call<{ accessToken: string; expiresIn: number }>("/parent/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  children: () => call<Child[]>("/parent/children"),

  payments: () => call<PaymentRecord[]>("/parent/payments"),

  pay: (studentId: string, amountMinor: string, payerPhone: string, channel: string) =>
    call<{ somaReference: string; status: string }>("/parent/pay", {
      method: "POST",
      body: JSON.stringify({ studentId, amountMinor, payerPhone, channel }),
    }),
};

/** Minor units to a display string. No floats touch money. */
export function formatMoney(minorUnits: string | bigint, currency: string): string {
  const value = typeof minorUnits === "bigint" ? minorUnits : BigInt(minorUnits || "0");
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${currency} ${whole}.${digits.slice(-2)}`;
}
