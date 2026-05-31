"use client";
import { useState, useCallback } from "react";
import FadeUp from "./FadeUp";

// Standard 20% rate for commission preview (matching the calculator)
const GROSS   = 8_000;
const RATE    = 0.20;   // preview shows standard rate
const MONTHS  = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

type Fields = {
  school_name:   string;
  director_name: string;
  role:          string;
  student_count: string;
  whatsapp:      string;
  email:         string;
};
type Errors = Partial<Record<keyof Fields, string>>;

const OFFER_ROWS = [
  { label: "Onboarding fee",     value: "WAIVED",          accent: "mustard" },
  { label: "First term fee",     value: "FREE",            accent: "mustard" },
  { label: "School commission",  value: "35% for life",    accent: "green"   },
  { label: "Teacher incentive",  value: "20% for life",    accent: "green"   },
  { label: "Support",            value: "White-glove",     accent: "light"   },
  { label: "Co-marketing",       value: "Featured on site",accent: "light"   },
];

export default function WaitlistForm() {
  const [fields, setFields] = useState<Fields>({
    school_name: "", director_name: "", role: "",
    student_count: "500", whatsapp: "", email: "",
  });
  const [errors,     setErrors]     = useState<Errors>({});
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState("");
  const [copied,     setCopied]     = useState(false);

  const count = Math.max(0, Math.min(5000, Number(fields.student_count) || 0));
  const annual = count * GROSS * RATE * MONTHS;
  const schoolLabel = fields.school_name.trim() || "your school";

  const set = useCallback(
    (key: keyof Fields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFields((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
        setApiError("");
      },
    []
  );

  function validate(): boolean {
    const errs: Errors = {};
    if (!fields.school_name.trim())
      errs.school_name = "Please enter your school name.";
    if (!fields.director_name.trim())
      errs.director_name = "Please enter your full name.";
    if (!fields.role)
      errs.role = "Please select your role.";
    if (!fields.student_count || Number(fields.student_count) < 50)
      errs.student_count = "Please enter at least 50 students.";
    if (!fields.whatsapp.trim())
      errs.whatsapp = "Please enter your WhatsApp number.";
    if (
      fields.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
    )
      errs.email = "Please enter a valid email address.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");

    try {
      const res = await fetch("/api/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name:   fields.school_name.trim(),
          director_name: fields.director_name.trim(),
          role:          fields.role,
          student_count: Number(fields.student_count),
          whatsapp:      fields.whatsapp.trim(),
          email:         fields.email.trim().toLowerCase() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(
          (data as { error?: string }).error ||
          "Something went wrong. Please try again or WhatsApp us directly: +256 700 000 000"
        );
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setApiError(
        "Something went wrong. Please try again or WhatsApp us directly: +256 700 000 000"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      id="waitlist"
      style={{ background: "#FAF3E0" }}
      data-screen-label="06 Waitlist Form"
    >
      <div className="wrap section-py">
        {/* Header */}
        <FadeUp>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto clamp(48px,6vw,72px)" }}>
            <span className="eyebrow" style={{ color: "#B97F0E" }}>
              Be first
            </span>
            <h2 className="section-h2-light" style={{ marginBottom: 14 }}>
              Be first. <em style={{ color: "#E5A019" }}>Earn more.</em>
            </h2>
            <p className="lead-light">
              Founding schools earn 35% lifetime commission versus 20% for
              standard schools. This offer closes at 5 founding schools.
            </p>
          </div>
        </FadeUp>

        <div className="waitlist-grid">
          {/* ── LEFT: Offer card ── */}
          <FadeUp>
            <div className="offer-card">
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(245,240,232,0.35)",
                    marginBottom: 4,
                  }}
                >
                  Founding School Offer
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: "clamp(16px, 1.8vw, 20px)",
                    color: "#F5F0E8",
                    lineHeight: 1.25,
                  }}
                >
                  What you unlock by joining first.
                </div>
              </div>

              {OFFER_ROWS.map(({ label, value, accent }) => (
                <div key={label} className="offer-row">
                  <span
                    style={{
                      fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                      color: "rgba(245,240,232,0.55)",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      color:
                        accent === "mustard" ? "#E5A019" :
                        accent === "green"   ? "#22C55E" :
                        "#F5F0E8",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}

              <div
                style={{
                  margin: "14px 16px",
                  padding: "12px 14px",
                  background: "rgba(229,160,25,0.07)",
                  border: "1px solid rgba(229,160,25,0.20)",
                  borderRadius: 8,
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 12.5,
                  color: "rgba(245,240,232,0.55)",
                  lineHeight: 1.55,
                }}
              >
                Founding rate locked{" "}
                <strong style={{ color: "#F5F0E8" }}>permanently</strong>{" "}
                — even as standard rate reduces at scale.
                <br />
                <span style={{ color: "rgba(245,240,232,0.35)", fontSize: 11, marginTop: 6, display: "block" }}>
                  * Offer closes at 5 founding schools. 2 spots remaining.
                </span>
              </div>
            </div>
          </FadeUp>

          {/* ── RIGHT: Form / Success ── */}
          <FadeUp delay={0.08}>
            {submitted ? (
              <SuccessState
                name={fields.director_name.trim().split(" ")[0]}
                school={schoolLabel}
                count={count}
                annual={fmtUGX(annual)}
                copied={copied}
                onCopy={copyLink}
              />
            ) : (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 12,
                  padding: "clamp(24px, 3vw, 40px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: "clamp(20px, 2.2vw, 28px)",
                    fontWeight: 700,
                    color: "#0D0D0D",
                    marginBottom: 4,
                  }}
                >
                  Claim your founding spot.
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 11,
                    color: "#9A9A9A",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 28,
                  }}
                >
                  2 minutes &nbsp;·&nbsp; WhatsApp reply within 24h
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {/* School name */}
                  <div className="field-wrap">
                    <label htmlFor="f_school" className="field-label">
                      School name <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      id="f_school"
                      type="text"
                      className={`field-input${errors.school_name ? " has-error" : ""}`}
                      placeholder="e.g. St. Mary's College Kisubi"
                      value={fields.school_name}
                      onChange={set("school_name")}
                      autoComplete="organization"
                    />
                    <span className="field-error-msg">{errors.school_name}</span>
                  </div>

                  {/* Name + Role */}
                  <div className="form-grid-2">
                    <div className="field-wrap">
                      <label htmlFor="f_name" className="field-label">
                        Your full name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        id="f_name"
                        type="text"
                        className={`field-input${errors.director_name ? " has-error" : ""}`}
                        placeholder="Full name"
                        value={fields.director_name}
                        onChange={set("director_name")}
                        autoComplete="name"
                      />
                      <span className="field-error-msg">{errors.director_name}</span>
                    </div>
                    <div className="field-wrap">
                      <label htmlFor="f_role" className="field-label">
                        Your role <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <select
                        id="f_role"
                        className={`field-input${errors.role ? " has-error" : ""}`}
                        value={fields.role}
                        onChange={set("role")}
                      >
                        <option value="" disabled>Select…</option>
                        <option value="Director / Proprietor">Director / Proprietor</option>
                        <option value="Head Teacher">Head Teacher</option>
                        <option value="Academic Registrar">Academic Registrar</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="field-error-msg">{errors.role}</span>
                    </div>
                  </div>

                  {/* Student count */}
                  <div className="field-wrap">
                    <label htmlFor="f_students" className="field-label">
                      Number of students <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      id="f_students"
                      type="number"
                      className={`field-input${errors.student_count ? " has-error" : ""}`}
                      placeholder="e.g. 500"
                      min={50}
                      max={5000}
                      value={fields.student_count}
                      onChange={set("student_count")}
                    />
                    <span className="field-helper">
                      Updates your commission preview below
                    </span>
                    <span className="field-error-msg">{errors.student_count}</span>
                  </div>

                  {/* Commission preview */}
                  <div className="commission-preview">
                    <div
                      style={{
                        fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                        fontSize: 13.5,
                        color: "rgba(13,13,13,0.65)",
                        lineHeight: 1.5,
                        marginBottom: 6,
                      }}
                    >
                      Based on{" "}
                      <strong style={{ color: "#0D0D0D" }}>
                        {count > 0 ? count.toLocaleString("en-US") : "…"} students
                      </strong>
                      ,{" "}
                      <strong style={{ color: "#0D0D0D" }}>{schoolLabel}</strong>{" "}
                      could earn
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                        fontWeight: 700,
                        fontSize: "clamp(20px, 2.8vw, 30px)",
                        color: "#E5A019",
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {count > 0 ? fmtUGX(annual) : "—"}{" "}
                      <span
                        style={{
                          fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                          fontSize: 13,
                          color: "rgba(13,13,13,0.45)",
                          fontWeight: 400,
                          letterSpacing: 0,
                        }}
                      >
                        / year in passive commission income.
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp + Email */}
                  <div className="form-grid-2">
                    <div className="field-wrap">
                      <label htmlFor="f_wa" className="field-label">
                        WhatsApp number <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        id="f_wa"
                        type="tel"
                        className={`field-input${errors.whatsapp ? " has-error" : ""}`}
                        placeholder="+256 700 000 000"
                        value={fields.whatsapp}
                        onChange={set("whatsapp")}
                        autoComplete="tel"
                      />
                      <span className="field-helper">
                        We will confirm your spot via WhatsApp
                      </span>
                      <span className="field-error-msg">{errors.whatsapp}</span>
                    </div>
                    <div className="field-wrap">
                      <label htmlFor="f_email" className="field-label">
                        Email address{" "}
                        <span style={{ color: "#9A9A9A", fontWeight: 400 }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        id="f_email"
                        type="email"
                        className={`field-input${errors.email ? " has-error" : ""}`}
                        placeholder="your@school.com"
                        value={fields.email}
                        onChange={set("email")}
                        autoComplete="email"
                      />
                      <span className="field-error-msg">{errors.email}</span>
                    </div>
                  </div>

                  {/* API error */}
                  {apiError && (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: 8,
                        fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                        fontSize: 13.5,
                        color: "#B91C1C",
                        lineHeight: 1.5,
                      }}
                      role="alert"
                    >
                      {apiError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary btn-full btn-lg"
                    style={{ marginTop: 4 }}
                  >
                    {submitting ? "Submitting…" : "Join the Waitlist →"}
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

function SuccessState({
  name, school, count, annual, copied, onCopy,
}: {
  name:    string;
  school:  string;
  count:   number;
  annual:  string;
  copied:  boolean;
  onCopy:  () => void;
}) {
  const waText = encodeURIComponent(
    `I just joined the Soma Africa waitlist — a grade intelligence platform for Ugandan private schools. Check it out: https://soma-africa.com`
  );

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: "clamp(32px, 4vw, 48px)",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* Checkmark */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(229,160,25,0.10)",
          border: "2px solid #E5A019",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 28,
          color: "#E5A019",
        }}
        aria-hidden="true"
      >
        ✓
      </div>

      <h3
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', serif",
          fontSize: "clamp(22px, 2.8vw, 32px)",
          fontWeight: 700,
          color: "#0D0D0D",
          lineHeight: 1.1,
          marginBottom: 14,
        }}
      >
        You&apos;re on the waitlist,{" "}
        <em style={{ color: "#E5A019" }}>{name || "Director"}.</em>
      </h3>

      <p
        style={{
          fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
          fontSize: 15.5,
          color: "rgba(13,13,13,0.65)",
          lineHeight: 1.65,
          maxWidth: "38ch",
          margin: "0 auto 28px",
        }}
      >
        <strong style={{ color: "#0D0D0D" }}>{school}</strong>
        {count > 0 && (
          <>
            {" "}with{" "}
            <strong style={{ color: "#0D0D0D" }}>
              {count.toLocaleString("en-US")} students
            </strong>{" "}
            could earn{" "}
            <strong style={{ color: "#E5A019" }}>{annual}</strong> per year in
            commission income.
          </>
        )}
        <br />
        We will be in touch within 24 hours on WhatsApp.
      </p>

      <p
        style={{
          fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#9A9A9A",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Share Soma with a fellow director:
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ fontSize: 14, padding: "11px 20px" }}
        >
          Share on WhatsApp
        </a>
        <button
          onClick={onCopy}
          className="btn-ghost"
          style={{ fontSize: 14, padding: "11px 20px" }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
