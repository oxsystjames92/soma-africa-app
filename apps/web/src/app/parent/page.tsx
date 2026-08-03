"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, storeToken } from "../../lib/api";

/**
 * Parent login. A phone number and a code — no password, because a parent
 * paying school fees three times a year will not remember one.
 */
export default function ParentLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.requestCode(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api.verifyCode(phone, code);
      storeToken(session.accessToken);
      router.push("/parent/children");
    } catch {
      // Deliberately vague: wrong code and unknown number look identical.
      setError("That code did not work. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>See what you owe. Pay from your phone.</h1>
      <p>Every child, every school, one number.</p>

      {step === "phone" ? (
        <form onSubmit={requestCode}>
          <label htmlFor="phone">The phone number your school has</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+256 700 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || phone.length < 9}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label htmlFor="code">The 6-digit code we sent you</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
            >
              Use a different number
            </button>
          </p>
        </form>
      )}
    </main>
  );
}
