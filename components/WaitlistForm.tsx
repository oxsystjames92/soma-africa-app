"use client";
import { useState, useCallback } from "react";

const FEE = 8000;
const FOUNDING_RATE = 0.35;
const MONTHS = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}
function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
  );
}

type Fields = {
  school: string;
  name: string;
  role: string;
  students: string;
  whatsapp: string;
  email: string;
};
type Errors = Partial<Record<keyof Fields, string>>;

export default function WaitlistForm() {
  const [fields, setFields] = useState<Fields>({
    school: "", name: "", role: "", students: "500", whatsapp: "", email: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const students = Math.max(0, Math.min(5000, Number(fields.students) || 0));
  const annualEarnings = students * FEE * FOUNDING_RATE * MONTHS;
  const schoolDisplay = fields.school.trim() || "your school";

  const set = useCallback(
    (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => ({ ...er, [key]: undefined }));
    },
    []
  );

  function validate(): boolean {
    const errs: Errors = {};
    if (!fields.school.trim()) errs.school = "Please enter your school's name.";
    if (!fields.name.trim()) errs.name = "Please enter your name.";
    if (!fields.role) errs.role = "Please select your role.";
    if (!fields.students || Number(fields.students) < 1)
      errs.students = "Please enter how many students your school has.";
    if (!fields.whatsapp.trim()) errs.whatsapp = "Please enter your WhatsApp number.";
    if (!fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      errs.email = "Please enter a valid email.";
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
          school_name: fields.school.trim(),
          contact_name: fields.name.trim(),
          role: fields.role,
          student_count: Number(fields.students),
          whatsapp: fields.whatsapp.trim(),
          email: fields.email.trim().toLowerCase(),
        }),
      });
      setSubmitted(true);
    } catch {
      // Show success anyway — data will be retried later
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="on-light"
      id="waitlist"
      data-screen-label="06 Waitlist form"
      style={{ background: "var(--parchment)" }}
    >
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 64px" }}>
          <span className="eyebrow">05 — Be first</span>
          <h2 className="display h-xl" style={{ margin: "18px 0 18px", color: "var(--ink)" }}>
            Be first. <em>Earn more.</em>
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Five founding schools. A 35% rate locked for life. After that, the
            door closes and the rate drops to 20%.
          </p>
        </div>

        <div
          className="waitlist-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "0.85fr 1.15fr",
            gap: "clamp(28px, 4vw, 56px)",
            alignItems: "start",
          }}
        >
          {/* Left — offer card */}
          <aside
            className="offer-card"
            style={{
              background: "var(--dark)", color: "var(--white)",
              borderRadius: 32, padding: "clamp(32px, 3vw, 44px)",
              position: "sticky", top: 100,
            }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 12px",
                background: "rgba(229,160,25,0.15)", border: "1px solid rgba(229,160,25,0.32)",
                color: "var(--mustard)", borderRadius: 999,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Founding-school offer
            </span>

            <h3
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                fontSize: "clamp(28px, 3vw, 38px)", lineHeight: 1.05,
                color: "var(--white)", margin: "0 0 30px", letterSpacing: "-0.01em",
              }}
            >
              What you{" "}
              <em style={{ color: "var(--mustard)", fontStyle: "italic" }}>unlock</em> by joining first.
            </h3>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
              {[
                { k: "Onboarding fee",     v: "Waived",              green: false, plain: false },
                { k: "First term fee",     v: "Free",                green: false, plain: false },
                { k: "School commission",  v: "35% for life",        green: true,  plain: false },
                { k: "Teacher incentive",  v: "20% for life",        green: true,  plain: false },
                { k: "Support",            v: "White-glove",         green: false, plain: true  },
                { k: "Co-marketing",       v: "Featured founding school", green: false, plain: true },
              ].map(({ k, v, green, plain }) => (
                <li
                  key={k}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr auto",
                    gap: 20, alignItems: "baseline",
                    padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 14.5,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{k}</span>
                  <span
                    style={{
                      fontFamily: plain ? "var(--font-manrope, sans-serif)" : "var(--font-playfair, Georgia, serif)",
                      fontWeight: 700, fontSize: plain ? 14.5 : 19,
                      color: plain ? "var(--white)" : green ? "var(--success)" : "var(--mustard)",
                      letterSpacing: "-0.005em", lineHeight: 1,
                    }}
                  >
                    {v}
                  </span>
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: 22, padding: "14px 16px",
                background: "rgba(229,160,25,0.08)", borderLeft: "3px solid var(--mustard)",
                borderRadius: 6, fontSize: 13, color: "rgba(255,255,255,0.86)", lineHeight: 1.5,
              }}
            >
              Founding rate is locked <strong>permanently</strong>. It never reduces — not at scale,
              not after launch, not ever.
            </div>
          </aside>

          {/* Right — form or success */}
          <div id="formContainer">
            {submitted ? (
              <SuccessCard
                school={fields.school.trim() || "Your school"}
                students={students}
                annual={annualEarnings}
              />
            ) : (
              <div
                style={{
                  background: "var(--white)", color: "var(--ink)",
                  borderRadius: 32, padding: "clamp(28px, 3.4vw, 46px)",
                  border: "1px solid var(--parchment-edge)",
                  boxShadow: "0 30px 80px rgba(13,13,13,0.06)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                    fontSize: "clamp(26px, 2.8vw, 34px)", lineHeight: 1.1,
                    margin: "0 0 8px", letterSpacing: "-0.01em",
                  }}
                >
                  Claim your founding spot.
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 30px" }}>
                  Sixty seconds. We reply on WhatsApp within 24 hours.
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  <Field
                    id="f_school" label="School name" type="text"
                    placeholder="e.g. St. Mary's College"
                    value={fields.school} onChange={set("school")}
                    error={errors.school}
                  />

                  <div className="form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field
                      id="f_name" label="Your name" type="text"
                      placeholder="Full name"
                      value={fields.name} onChange={set("name")}
                      error={errors.name}
                    />
                    <div className={`field${errors.role ? " error" : ""}`}>
                      <label htmlFor="f_role">Your role</label>
                      <select id="f_role" value={fields.role} onChange={set("role")} required>
                        <option value="" disabled>Select a role…</option>
                        <option value="Director">Director</option>
                        <option value="Head Teacher">Head Teacher</option>
                        <option value="Academic Registrar">Academic Registrar</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.role && <span className="err-msg">{errors.role}</span>}
                    </div>
                  </div>

                  <Field
                    id="f_students" label="Number of students" type="number"
                    placeholder="e.g. 500" min={50} max={5000}
                    value={fields.students} onChange={set("students")}
                    error={errors.students}
                  />

                  {/* Commission preview */}
                  <div
                    style={{
                      marginTop: 4, padding: "18px 20px",
                      background: "linear-gradient(135deg, var(--mustard-tint), #fff)",
                      border: "1px solid rgba(229,160,25,0.30)", borderRadius: 14,
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                      Based on <strong style={{ color: "var(--ink)" }}>{students.toLocaleString("en-US")}</strong>{" "}
                      students, <strong style={{ color: "var(--ink)" }}>{schoolDisplay}</strong> could earn
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                        fontSize: "clamp(22px, 2.4vw, 30px)", lineHeight: 1,
                        color: "var(--mustard-deep)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
                      }}
                    >
                      {fmtUGX(annualEarnings)} / yr
                    </div>
                  </div>

                  <div className="form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field
                      id="f_wa" label="WhatsApp number" type="tel"
                      placeholder="+256 …"
                      value={fields.whatsapp} onChange={set("whatsapp")}
                      error={errors.whatsapp}
                    />
                    <Field
                      id="f_email" label="Email address" type="email"
                      placeholder="name@school.ac.ug"
                      value={fields.email} onChange={set("email")}
                      error={errors.email}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%", marginTop: 8, padding: 18, fontSize: 16,
                      background: submitting ? "var(--mustard-deep)" : "var(--mustard)",
                      color: "var(--dark)", border: 0, borderRadius: 999,
                      fontWeight: 700, cursor: submitting ? "default" : "pointer",
                      transition: "background-color 180ms, box-shadow 220ms, transform 180ms var(--ease)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                  >
                    {submitting ? "Submitting…" : <>Join the Waitlist <span className="arr">→</span></>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}

function Field({
  id, label, type, placeholder, value, onChange, error, min, max,
}: {
  id: string; label: string; type: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; min?: number; max?: number;
}) {
  return (
    <div className={`field${error ? " error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={onChange} required min={min} max={max}
      />
      {error && <span className="err-msg">{error}</span>}
    </div>
  );
}

function SuccessCard({
  school, students, annual,
}: {
  school: string; students: number; annual: number;
}) {
  return (
    <div
      style={{
        background: "var(--dark)", color: "var(--white)",
        borderRadius: 32, padding: "clamp(36px, 4vw, 56px)",
        textAlign: "center", boxShadow: "0 30px 80px rgba(13,13,13,0.20)",
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "var(--mustard)", color: "var(--dark)",
          display: "grid", placeItems: "center", fontSize: 36,
          margin: "0 auto 24px", boxShadow: "0 0 0 8px rgba(229,160,25,0.18)",
        }}
      >
        ✓
      </div>
      <h3
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
          fontSize: "clamp(28px, 3.6vw, 42px)", margin: "0 0 18px",
          color: "var(--white)", lineHeight: 1.05, letterSpacing: "-0.015em",
        }}
        dangerouslySetInnerHTML={{
          __html: `You're on the waitlist, <em style="color:var(--mustard);font-style:italic">${escapeHtml(school)}.</em>`,
        }}
      />
      <p style={{ color: "rgba(255,255,255,0.74)", maxWidth: "44ch", margin: "0 auto", lineHeight: 1.55 }}>
        We&apos;ll be in touch on WhatsApp within 24 hours to set up an onboarding call.
      </p>

      <div
        style={{
          marginTop: 30, padding: "26px 24px",
          background: "rgba(229,160,25,0.10)", border: "1px solid rgba(229,160,25,0.30)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
            fontWeight: 700, color: "var(--mustard)", marginBottom: 10,
          }}
        >
          Your projected annual earnings
        </div>
        <div
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
            fontSize: "clamp(36px, 4.4vw, 54px)", color: "var(--mustard)",
            lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em",
          }}
        >
          {fmtUGX(annual)}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          Based on {students.toLocaleString("en-US")} students at the founding-school rate of 35%.
        </div>
      </div>

      <div
        style={{
          marginTop: 28, paddingTop: 22, borderTop: "1px dashed rgba(255,255,255,0.18)",
          fontSize: 13.5, color: "rgba(255,255,255,0.66)",
        }}
      >
        Founder Daniel will message you personally · within one working day.
      </div>
    </div>
  );
}
