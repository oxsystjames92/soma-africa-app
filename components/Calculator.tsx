"use client";
import { useState, useCallback } from "react";

const FEE_PER_STUDENT = 8000;
const SCHOOL_RATE = 0.2;
const TEACHER_RATE = 0.15;
const SCHOOL_MONTHS = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

export default function Calculator() {
  const [students, setStudents] = useState(500);

  const clamp = (v: number) => Math.max(100, Math.min(2000, v));

  const monthly = students * FEE_PER_STUDENT * SCHOOL_RATE;
  const annual = monthly * SCHOOL_MONTHS;
  const teacher = students * FEE_PER_STUDENT * TEACHER_RATE * SCHOOL_MONTHS;
  const pct = ((students - 100) / (2000 - 100)) * 100;

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStudents(clamp(Number(e.target.value)));
    },
    []
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value) || 100;
      setStudents(clamp(v));
    },
    []
  );

  return (
    <section
      className="on-light"
      id="pricing"
      data-screen-label="04 Calculator"
      style={{ background: "var(--parchment)" }}
    >
      <span className="section-ordinal" aria-hidden="true">03</span>
      <div className="wrap">
        <div
          className="calc-head"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            alignItems: "end",
            marginBottom: 60,
          }}
        >
          <div>
            <span className="eyebrow">03 — Commission</span>
            <h2
              className="display h-xl"
              style={{ margin: "18px 0 0", color: "var(--ink)" }}
            >
              Soma <em>pays your school.</em>
            </h2>
          </div>
          <p className="lead">
            Parents pay a small monthly fee, bundled into school fees. Your
            school earns a commission — every month, for as long as Soma runs.
            Move the slider.
          </p>
        </div>

        <div
          style={{
            background: "var(--white)",
            borderRadius: 32,
            padding: "clamp(28px, 3.4vw, 52px)",
            border: "1px solid var(--parchment-edge)",
            boxShadow: "0 30px 80px rgba(13,13,13,0.06)",
          }}
        >
          {/* Slider row */}
          <div
            className="calc-top"
            style={{
              display: "grid",
              gridTemplateColumns: "0.9fr 1.1fr",
              gap: 44,
              alignItems: "center",
              paddingBottom: 36,
              borderBottom: "1px dashed var(--parchment-edge)",
              marginBottom: 32,
            }}
          >
            <div>
              <label
                htmlFor="studentInput"
                style={{
                  display: "block", fontSize: 11.5, letterSpacing: "0.18em",
                  textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", marginBottom: 14,
                }}
              >
                Your school size
              </label>
              <div
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                  fontSize: "clamp(60px, 7vw, 96px)", lineHeight: 1,
                  color: "var(--ink)", display: "flex", alignItems: "baseline", gap: 14,
                }}
              >
                <input
                  id="studentInput"
                  type="number"
                  min={100}
                  max={2000}
                  step={10}
                  value={students}
                  onChange={handleInput}
                  style={{
                    font: "inherit", border: 0, background: "transparent",
                    color: "var(--mustard-deep)", width: "5ch", padding: 0,
                    borderBottom: "3px solid var(--mustard)", outline: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-manrope, sans-serif)", fontWeight: 500,
                    fontSize: 15, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase",
                  }}
                >
                  students
                </span>
              </div>
            </div>

            <div style={{ padding: "20px 0 6px" }}>
              <input
                id="studentSlider"
                type="range"
                min={100}
                max={2000}
                step={10}
                value={students}
                onChange={handleSlider}
                className="calc-slider"
                style={{ "--pct": `${pct}%` } as React.CSSProperties}
              />
              <div
                style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 11, color: "var(--muted)", marginTop: 14, letterSpacing: "0.04em",
                }}
              >
                {["100", "500", "1,000", "1,500", "2,000"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div
            className="calc-cards"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 30,
            }}
          >
            <CalcCard
              label="Monthly school earnings"
              value={fmtUGX(monthly)}
              sub="Paid to your school account every month."
              hero={false}
            />
            <CalcCard
              label="Annual school earnings"
              value={fmtUGX(annual)}
              sub="For doing nothing different. Soma does the work."
              hero
            />
            <CalcCard
              label="Annual teacher pool"
              value={fmtUGX(teacher)}
              sub="To reward teachers who use Soma most."
              hero={false}
            />
          </div>

          {/* Anchor */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "20px 24px", background: "var(--mustard)", color: "var(--dark)",
              borderRadius: 14, fontSize: 15, marginBottom: 30,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 700, fontSize: 28, lineHeight: 1, color: "var(--dark)",
              }}
            >
              ↳
            </span>
            <span>
              <strong>
                A <em style={{ fontStyle: "normal", fontWeight: 700 }}>{students.toLocaleString("en-US")}</em>
                -student school earns{" "}
                <em style={{ fontStyle: "normal", fontWeight: 700 }}>{fmtUGX(annual)}</em> per year.
              </strong>{" "}
              Passively.
            </span>
          </div>

          {/* CTA row */}
          <div
            className="calc-cta-row"
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 20, flexWrap: "wrap",
            }}
          >
            <a href="#waitlist" className="btn large">
              Join the Waitlist to Unlock This <span className="arr">→</span>
            </a>
            <p style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: "42ch", margin: 0 }}>
              UGX 8,000 per pupil / month. Standard schools earn 20% · Founding
              schools earn 35%. Teacher pool 15%.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}

function CalcCard({
  label,
  value,
  sub,
  hero,
}: {
  label: string;
  value: string;
  sub: string;
  hero: boolean;
}) {
  return (
    <div
      style={{
        background: hero ? "var(--mustard)" : "var(--dark)",
        color: hero ? "var(--dark)" : "var(--white)",
        borderRadius: 14,
        padding: "26px 24px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase",
          fontWeight: 700, color: hero ? "rgba(13,13,13,0.65)" : "rgba(255,255,255,0.55)",
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
          fontSize: "clamp(28px, 3.2vw, 42px)", lineHeight: 1,
          letterSpacing: "-0.015em",
          color: hero ? "var(--dark)" : "var(--mustard)",
          marginBottom: 8, transition: "opacity 80ms",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: hero ? "rgba(13,13,13,0.72)" : "rgba(255,255,255,0.58)", lineHeight: 1.45 }}>
        {sub}
      </div>
    </div>
  );
}
