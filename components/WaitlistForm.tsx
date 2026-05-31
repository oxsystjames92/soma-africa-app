"use client";
import { useState, useCallback } from "react";
import FadeUp from "./FadeUp";

const FEE      = 8000;
const RATE     = 0.35;   // founding rate shown in preview
const MONTHS   = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

type Fields = {
  school:   string;
  name:     string;
  role:     string;
  students: string;
  whatsapp: string;
  email:    string;
};
type Errors = Partial<Record<keyof Fields, string>>;

export default function WaitlistForm() {
  const [fields, setFields] = useState<Fields>({
    school: "", name: "", role: "", students: "500", whatsapp: "", email: "",
  });
  const [errors,    setErrors]    = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting,setSubmitting]= useState(false);

  const count    = Math.max(0, Math.min(5000, Number(fields.students) || 0));
  const preview  = fmtUGX(count * FEE * RATE * MONTHS);
  const schoolLabel = fields.school.trim() || "your school";

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
    if (!fields.school.trim())   errs.school   = "Please enter your school name.";
    if (!fields.name.trim())     errs.name     = "Please enter your name.";
    if (!fields.role)            errs.role     = "Please select your role.";
    if (!fields.students || Number(fields.students) < 1)
                                 errs.students = "Please enter a student count.";
    if (!fields.whatsapp.trim()) errs.whatsapp = "Please enter your WhatsApp number.";
    if (!fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
                                 errs.email    = "Please enter a valid email.";
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
          school_name:   fields.school.trim(),
          contact_name:  fields.name.trim(),
          role:          fields.role,
          student_count: fields.students,
          whatsapp:      fields.whatsapp.trim(),
          email:         fields.email.trim().toLowerCase(),
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
        <FadeUp>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 56px" }}>
            <span className="eyebrow" style={{ display: "inline-flex", marginBottom: 18 }}>
              Be first
            </span>
            <h2 className="display h-xl" style={{ marginTop: 16, marginBottom: 18 }}>
              Founding schools earn <em>35% for life.</em>
            </h2>
            <p className="lead" style={{ margin: "0 auto" }}>
              Five founding schools. A 35% rate locked permanently — versus 20%
              for every school after. Three spots are taken. Two remain.
            </p>
          </div>
        </FadeUp>

        <div className="waitlist-section-grid">
          {/* Left — offer */}
          <FadeUp>
            <div
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-2)",
                borderRadius: 12,
                overflow: "hidden",
                position: "sticky",
                top: 80,
              }}
            >
              <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-2)" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--tx-3)",
                    marginBottom: 4,
                  }}
                >
                  Founding school offer
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(17px, 1.8vw, 22px)",
                    color: "var(--tx-1)",
                    lineHeight: 1.25,
                  }}
                >
                  What you unlock by joining first.
                </div>
              </div>
              {[
                { k: "Onboarding fee",    v: "Waived",                bold: true  },
                { k: "First term",        v: "Free",                  bold: true  },
                { k: "School commission", v: "35% for life",          bold: true  },
                { k: "Teacher pool",      v: "15%",                   bold: false },
                { k: "Support",           v: "Direct WhatsApp line",  bold: false },
              ].map(({ k, v, bold }, i, arr) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "13px 22px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border-2)" : undefined,
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--tx-2)" }}>{k}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 12,
                      color: bold ? "var(--gold)" : "var(--em)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
              <div
                style={{
                  margin: 16,
                  padding: "12px 14px",
                  background: "rgba(63,160,121,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--tx-2)",
                  lineHeight: 1.55,
                }}
              >
                The founding rate is locked{" "}
                <strong style={{ color: "var(--tx-1)" }}>permanently</strong> — not
                for the first year, not until a threshold. Forever.
              </div>
            </div>
          </FadeUp>

          {/* Right — form */}
          <FadeUp delay={0.1}>
            {submitted ? (
              <SuccessCard school={schoolLabel} annual={preview} />
            ) : (
              <div
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 12,
                  padding: "clamp(24px, 3vw, 40px)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(20px, 2.2vw, 28px)",
                    fontWeight: 400,
                    color: "var(--tx-1)",
                    marginBottom: 5,
                  }}
                >
                  Claim your founding spot.
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--tx-3)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 24,
                  }}
                >
                  60 seconds &nbsp;·&nbsp; WhatsApp reply within 24h
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* School */}
                  <div className={`field${errors.school ? " error" : ""}`}>
                    <label htmlFor="f_school">School name</label>
                    <input id="f_school" type="text" placeholder="e.g. St. Mary's College"
                      value={fields.school} onChange={set("school")} required />
                    <span className="err-msg">{errors.school}</span>
                  </div>

                  {/* Name + Role */}
                  <div className="form-row-2">
                    <div className={`field${errors.name ? " error" : ""}`}>
                      <label htmlFor="f_name">Your name</label>
                      <input id="f_name" type="text" placeholder="Full name"
                        value={fields.name} onChange={set("name")} required />
                      <span className="err-msg">{errors.name}</span>
                    </div>
                    <div className={`field${errors.role ? " error" : ""}`}>
                      <label htmlFor="f_role">Your role</label>
                      <select id="f_role" value={fields.role} onChange={set("role")} required>
                        <option value="" disabled>Select…</option>
                        <option value="Director">Director</option>
                        <option value="Head Teacher">Head Teacher</option>
                        <option value="Academic Registrar">Academic Registrar</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="err-msg">{errors.role}</span>
                    </div>
                  </div>

                  {/* Students */}
                  <div className={`field${errors.students ? " error" : ""}`}>
                    <label htmlFor="f_students">Number of students</label>
                    <input id="f_students" type="number" placeholder="e.g. 500"
                      min={50} max={5000} value={fields.students}
                      onChange={set("students")} required />
                    <span className="err-msg">{errors.students}</span>
                  </div>

                  {/* Commission preview */}
                  <div className="commission-preview">
                    <div style={{ fontSize: 13, color: "var(--tx-2)", lineHeight: 1.4 }}>
                      At the founding rate, <strong style={{ color: "var(--tx-1)" }}>{schoolLabel}</strong> could earn
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "clamp(20px, 2.4vw, 28px)",
                        color: "var(--gold)",
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {preview} / yr
                    </div>
                  </div>

                  {/* WhatsApp + Email */}
                  <div className="form-row-2">
                    <div className={`field${errors.whatsapp ? " error" : ""}`}>
                      <label htmlFor="f_wa">WhatsApp number</label>
                      <input id="f_wa" type="tel" placeholder="+256 700 000000"
                        value={fields.whatsapp} onChange={set("whatsapp")} required />
                      <span className="err-msg">{errors.whatsapp}</span>
                    </div>
                    <div className={`field${errors.email ? " error" : ""}`}>
                      <label htmlFor="f_email">Email address</label>
                      <input id="f_email" type="email" placeholder="you@school.ac.ug"
                        value={fields.email} onChange={set("email")} required />
                      <span className="err-msg">{errors.email}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary full large"
                    style={{ marginTop: 4 }}
                  >
                    {submitting
                      ? "Submitting…"
                      : <>Join the Waitlist <span className="arr">→</span></>}
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

function SuccessCard({ school, annual }: { school: string; annual: string }) {
  return (
    <div
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "clamp(32px, 4vw, 48px)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "rgba(63,160,121,0.10)", border: "1.5px solid var(--em)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "var(--em)", margin: "0 auto 20px",
        }}
      >
        ✓
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(22px, 2.8vw, 32px)",
          fontWeight: 400, color: "var(--tx-1)", lineHeight: 1.1, marginBottom: 12,
        }}
      >
        You&apos;re on the waitlist,{" "}
        <em style={{ color: "var(--em)" }}>{school}.</em>
      </h3>
      <p style={{ color: "var(--tx-2)", maxWidth: "40ch", margin: "0 auto 28px", lineHeight: 1.6 }}>
        We&apos;ll be in touch on WhatsApp within 24 hours to walk you through
        the next steps and lock in your founding rate.
      </p>
      <div
        style={{
          padding: "20px 24px", background: "rgba(201,168,76,0.07)",
          border: "1px solid rgba(201,168,76,0.24)", borderRadius: 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--tx-3)", marginBottom: 8,
          }}
        >
          Your projected annual earnings (founding rate)
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontWeight: 700,
            fontSize: "clamp(28px, 3.6vw, 42px)", color: "var(--gold)",
            lineHeight: 1, letterSpacing: "-0.02em",
          }}
        >
          {annual}
        </div>
      </div>
    </div>
  );
}
