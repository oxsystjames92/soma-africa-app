"use client";
import { useState, useCallback } from "react";
import FadeUp from "./FadeUp";

type Fields = {
  name: string;
  school: string;
  whatsapp: string;
  students: string;
};
type Errors = Partial<Record<keyof Fields, string>>;

const studentOptions = [
  { value: "Under 200",  label: "Under 200 students" },
  { value: "200–500",    label: "200 – 500 students" },
  { value: "500–1,000",  label: "500 – 1,000 students" },
  { value: "Over 1,000", label: "Over 1,000 students" },
];

export default function WaitlistForm() {
  const [fields, setFields] = useState<Fields>({ name: "", school: "", whatsapp: "", students: "" });
  const [errors, setErrors]   = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = useCallback(
    (key: keyof Fields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFields((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
      },
    []
  );

  function validate(): boolean {
    const errs: Errors = {};
    if (!fields.name.trim())     errs.name     = "Please enter your name.";
    if (!fields.school.trim())   errs.school   = "Please enter your school name.";
    if (!fields.whatsapp.trim()) errs.whatsapp = "Please enter your WhatsApp number.";
    if (!fields.students)        errs.students = "Please select how many students.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name:  fields.name.trim(),
          school_name:   fields.school.trim(),
          whatsapp:      fields.whatsapp.trim(),
          student_count: fields.students,
        }),
      });
    } catch {
      /* Network error — show success anyway */
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  return (
    <section
      id="waitlist"
      style={{ background: "var(--bg-alt)" }}
      data-screen-label="06 Waitlist"
    >
      <div className="section-divider" />

      <div className="wrap">
        <div className="waitlist-section-grid">
          {/* Left — context */}
          <FadeUp>
            <div>
              <span className="eyebrow" style={{ marginBottom: 18, display: "inline-flex" }}>
                Join the waitlist
              </span>
              <h2 className="display h-xl" style={{ marginTop: 16, marginBottom: 24 }}>
                Founding schools get <em>35% off</em> forever.
              </h2>
              <p className="lead" style={{ marginBottom: 36 }}>
                Limited to 50 schools. Once we hit that number, the founding
                rate closes and the price goes up. We reply on WhatsApp within
                24 hours of every application.
              </p>

              {/* Offer details */}
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {[
                  { k: "Onboarding fee",    v: "Waived" },
                  { k: "First term",        v: "Free" },
                  { k: "School commission", v: "35% for life" },
                  { k: "Support",           v: "Direct WhatsApp line" },
                ].map(({ k, v }, i) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "14px 20px",
                      borderBottom: i < 3 ? "1px solid var(--border-2)" : undefined,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: "var(--tx-2)" }}>{k}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: i < 2 ? "var(--gold)" : "var(--em)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              <p
                style={{
                  marginTop: 20,
                  fontSize: 12.5,
                  color: "var(--tx-3)",
                  lineHeight: 1.6,
                  borderLeft: "2px solid var(--border)",
                  paddingLeft: 14,
                }}
              >
                The founding rate is locked permanently — not for the first year,
                not until you reach a threshold. Forever.
              </p>
            </div>
          </FadeUp>

          {/* Right — form or success */}
          <FadeUp delay={0.1}>
            {submitted ? (
              <SuccessCard school={fields.school.trim() || "Your school"} />
            ) : (
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 14,
                  padding: "clamp(28px, 3vw, 44px)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(22px, 2.2vw, 30px)",
                    fontWeight: 400,
                    color: "var(--tx-1)",
                    marginBottom: 6,
                  }}
                >
                  Apply for a founding school spot.
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-3)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 28,
                  }}
                >
                  60 seconds &nbsp;·&nbsp; WhatsApp reply within 24h
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  <div className={`field${errors.name ? " error" : ""}`}>
                    <label htmlFor="f_name">Your name</label>
                    <input
                      id="f_name" type="text" placeholder="Full name"
                      value={fields.name} onChange={set("name")} required
                    />
                    <span className="err-msg">{errors.name}</span>
                  </div>

                  <div className={`field${errors.school ? " error" : ""}`}>
                    <label htmlFor="f_school">School name</label>
                    <input
                      id="f_school" type="text" placeholder="e.g. St. Mary's College"
                      value={fields.school} onChange={set("school")} required
                    />
                    <span className="err-msg">{errors.school}</span>
                  </div>

                  <div className={`field${errors.whatsapp ? " error" : ""}`}>
                    <label htmlFor="f_wa">WhatsApp number</label>
                    <input
                      id="f_wa" type="tel" placeholder="+256 700 000000"
                      value={fields.whatsapp} onChange={set("whatsapp")} required
                    />
                    <span className="err-msg">{errors.whatsapp}</span>
                  </div>

                  <div className={`field${errors.students ? " error" : ""}`}>
                    <label htmlFor="f_students">Number of students</label>
                    <select id="f_students" value={fields.students} onChange={set("students")} required>
                      <option value="" disabled>Select a range…</option>
                      {studentOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="err-msg">{errors.students}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary full large"
                    style={{ marginTop: 4 }}
                  >
                    {submitting
                      ? "Submitting…"
                      : <>Apply for Founding School Access <span className="arr">→</span></>}
                  </button>
                </form>
              </div>
            )}
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function SuccessCard({ school }: { school: string }) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "clamp(36px, 4vw, 52px)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(63,160,121,0.15)",
          border: "1.5px solid var(--em)",
          display: "grid", placeItems: "center",
          fontSize: 28, margin: "0 auto 22px",
          color: "var(--em)",
        }}
      >
        ✓
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(24px, 2.8vw, 36px)",
          fontWeight: 400,
          color: "var(--tx-1)",
          lineHeight: 1.1,
          marginBottom: 14,
        }}
      >
        You&apos;re on the waitlist,{" "}
        <em style={{ color: "var(--em)" }}>{school}.</em>
      </h3>
      <p style={{ color: "var(--tx-2)", maxWidth: "40ch", margin: "0 auto", lineHeight: 1.6 }}>
        We&apos;ll be in touch on WhatsApp within 24 hours to walk you through
        the next steps.
      </p>
      <div
        style={{
          marginTop: 32,
          padding: "18px 20px",
          background: "rgba(63,160,121,0.06)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--tx-3)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Founder Daniel will message you personally · within one working day
      </div>
    </div>
  );
}
