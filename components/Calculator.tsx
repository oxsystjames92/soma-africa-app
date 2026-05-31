"use client";
import { useState, useCallback } from "react";
import FadeUp from "./FadeUp";

const FEE_PER_STUDENT  = 8000;   // UGX per pupil / month
const SCHOOL_RATE      = 0.20;   // 20% standard · 35% founding
const FOUNDING_RATE    = 0.35;
const TEACHER_RATE     = 0.15;
const MONTHS           = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

export default function Calculator() {
  const [students, setStudents] = useState(500);

  const clamp = (v: number) => Math.max(100, Math.min(2000, v));
  const pct   = ((students - 100) / (2000 - 100)) * 100;

  const monthly   = students * FEE_PER_STUDENT * SCHOOL_RATE;
  const annual    = monthly * MONTHS;
  const founding  = students * FEE_PER_STUDENT * FOUNDING_RATE * MONTHS;
  const teacher   = students * FEE_PER_STUDENT * TEACHER_RATE  * MONTHS;

  const onSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStudents(clamp(Number(e.target.value)));
  }, []);

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStudents(clamp(Number(e.target.value) || 100));
  }, []);

  return (
    <section
      id="pricing"
      style={{ background: "var(--bg-alt)" }}
      data-screen-label="04 Calculator"
    >
      <div className="section-divider" />
      <div className="wrap">
        {/* Header */}
        <FadeUp>
          <div className="calc-head">
            <div>
              <span className="eyebrow">Commission</span>
              <h2 className="display h-xl" style={{ marginTop: 16 }}>
                Soma <em>pays your school.</em>
              </h2>
            </div>
            <p className="lead">
              Parents pay a small monthly fee — bundled into school fees.
              Your school earns a commission every month, for as long as
              Soma runs. Move the slider to see your numbers.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="calc-card">
            {/* Slider row */}
            <div className="calc-top">
              <div>
                <label
                  htmlFor="studentInput"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--tx-3)",
                    marginBottom: 12,
                  }}
                >
                  Your school size
                </label>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <input
                    id="studentInput"
                    type="number"
                    min={100}
                    max={2000}
                    step={10}
                    value={students}
                    onChange={onInput}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "clamp(48px, 6vw, 80px)",
                      lineHeight: 1,
                      color: "var(--gold)",
                      background: "transparent",
                      border: 0,
                      borderBottom: "2px solid var(--gold)",
                      outline: "none",
                      width: "4ch",
                      padding: 0,
                      MozAppearance: "textfield",
                    } as React.CSSProperties}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--tx-3)",
                    }}
                  >
                    students
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: 8 }}>
                <input
                  id="studentSlider"
                  type="range"
                  min={100}
                  max={2000}
                  step={10}
                  value={students}
                  onChange={onSlider}
                  className="calc-slider"
                  style={{ "--pct": `${pct}%` } as React.CSSProperties}
                />
                <div className="calc-slider-labels">
                  {["100", "500", "1,000", "1,500", "2,000"].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Output cards */}
            <div className="calc-cards">
              <CalcCard
                label="Monthly school earnings"
                value={fmtUGX(monthly)}
                sub="Paid to your school account every month."
                accent={false}
              />
              <CalcCard
                label="Annual school earnings"
                value={fmtUGX(annual)}
                sub="Standard 20% rate — every school earns this."
                accent={false}
              />
              <CalcCard
                label="Founding school rate"
                value={fmtUGX(founding)}
                sub="At 35% — locked for life. Available to the first 5 schools only."
                accent
              />
            </div>

            {/* Anchor summary */}
            <div className="calc-anchor">
              <span className="calc-anchor-arrow">↳</span>
              <span>
                At{" "}
                <strong>{students.toLocaleString("en-US")} students</strong>,
                a founding school earns{" "}
                <strong style={{ color: "var(--gold)" }}>{fmtUGX(founding)}</strong>{" "}
                per year. Passively.{" "}
                <span style={{ color: "var(--tx-3)", fontWeight: 400 }}>
                  (Teacher pool: {fmtUGX(teacher)} / year)
                </span>
              </span>
            </div>

            {/* CTA */}
            <div className="calc-cta-row">
              <a href="#waitlist" className="btn btn-primary large">
                Join the Waitlist to Unlock This <span className="arr">→</span>
              </a>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--tx-3)",
                  maxWidth: "44ch",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                UGX 8,000 per pupil / month. Standard schools earn 20%.
                Founding schools earn 35%. Teacher pool 15%.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function CalcCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--em)" : "var(--bg-base)",
        border: `1px solid ${accent ? "var(--em)" : "var(--border-2)"}`,
        borderRadius: 10,
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accent ? "rgba(10,15,13,0.65)" : "var(--tx-3)",
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: "clamp(22px, 2.8vw, 34px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ? "var(--bg-base)" : "var(--gold)",
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: accent ? "rgba(10,15,13,0.72)" : "var(--tx-2)",
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
