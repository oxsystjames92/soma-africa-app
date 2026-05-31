"use client";
import { useState, useCallback } from "react";
import FadeUp from "./FadeUp";

// UGX 8,000 gross per student / month
// School commission: 20%  → 1,600 / student / month
// Teacher pool:     15%  → 1,200 / student / month
// Annual multiplier:       10 months
const GROSS        = 8_000;
const SCHOOL_RATE  = 0.20;
const TEACHER_RATE = 0.15;
const MONTHS       = 10;

function fmtUGX(n: number) {
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

export default function Calculator() {
  const [students, setStudents] = useState(500);

  const clamp = (v: number) => Math.max(100, Math.min(2000, v));
  const pct   = ((students - 100) / (2000 - 100)) * 100;

  const monthly = students * GROSS * SCHOOL_RATE;
  const annual  = monthly * MONTHS;
  const teacher = students * GROSS * TEACHER_RATE * MONTHS;

  const onSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStudents(clamp(Number(e.target.value)));
  }, []);

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!isNaN(v)) setStudents(clamp(v));
  }, []);

  return (
    <section
      id="calculator"
      style={{ background: "#FAF3E0" }}
      data-screen-label="04 Calculator"
    >
      <div className="wrap section-py">
        {/* Header */}
        <FadeUp>
          <div className="calc-head">
            <div>
              <span className="eyebrow" style={{ color: "#B97F0E" }}>
                Commission
              </span>
              <h2 className="section-h2-light">
                Soma <em style={{ color: "#E5A019" }}>pays your school.</em>
              </h2>
            </div>
            <p className="lead-light" style={{ paddingTop: 8 }}>
              Every parent pays a small monthly fee bundled into school fees.
              Your school earns a perpetual commission — automatically — for
              as long as students are enrolled. Move the slider to see your
              numbers.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.10}>
          <div className="calc-card">
            {/* Slider section */}
            <div style={{ marginBottom: 8 }}>
              <label
                htmlFor="calc-slider"
                style={{
                  display: "block",
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(13,13,13,0.45)",
                  marginBottom: 16,
                }}
              >
                Number of students enrolled at your school
              </label>

              {/* Live value + unit */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <input
                  id="calc-number"
                  type="number"
                  min={100}
                  max={2000}
                  step={50}
                  value={students}
                  onChange={onInput}
                  aria-label="Number of students"
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: "clamp(48px, 7vw, 80px)",
                    fontWeight: 700,
                    color: "#E5A019",
                    background: "transparent",
                    border: "none",
                    borderBottom: "3px solid #E5A019",
                    outline: "none",
                    width: "3.6ch",
                    padding: 0,
                    lineHeight: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(13,13,13,0.4)",
                  }}
                >
                  students
                </span>
              </div>

              {/* Slider */}
              <input
                id="calc-slider"
                type="range"
                min={100}
                max={2000}
                step={50}
                value={students}
                onChange={onSlider}
                className="calc-slider"
                style={{ "--pct": `${pct}%` } as React.CSSProperties}
                aria-label="Slider: number of students"
              />

              {/* Tick labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                {["100", "500", "1,000", "1,500", "2,000"].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "rgba(13,13,13,0.35)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Output cards */}
            <div className="calc-cards">
              <OutputCard
                label="Monthly school earnings"
                value={fmtUGX(monthly)}
                sub="School commission (20%)"
              />
              <OutputCard
                label="Annual school earnings"
                value={fmtUGX(annual)}
                sub="Passive income per year"
              />
              <OutputCard
                label="Annual teacher pool"
                value={fmtUGX(teacher)}
                sub="Compliance incentive fund"
              />
            </div>

            {/* Anchor summary */}
            <div className="calc-anchor">
              A{" "}
              <strong style={{ color: "#0D0D0D" }}>
                {students.toLocaleString("en-US")}-student school
              </strong>{" "}
              earns{" "}
              <strong style={{ color: "#E5A019" }}>{fmtUGX(annual)}</strong>{" "}
              per year. Passively. While making parents happier.
            </div>

            {/* CTA */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 12,
                marginTop: 28,
              }}
            >
              <a
                href="#waitlist"
                className="btn-primary btn-lg"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Join the Waitlist to Unlock This →
              </a>
              <p
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 11.5,
                  color: "rgba(13,13,13,0.40)",
                  lineHeight: 1.6,
                }}
              >
                Formula: UGX 8,000 gross per student per month. School earns
                20% commission. Teacher incentive pool 15%. Platform fee 65%.
                Zero cost to your school.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function OutputCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub:   string;
}) {
  return (
    <div className="calc-output-card">
      <div
        style={{
          fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,240,232,0.40)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', serif",
          fontWeight: 700,
          fontSize: "clamp(18px, 2.4vw, 26px)",
          color: "#E5A019",
          lineHeight: 1,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
          fontSize: 12,
          color: "rgba(245,240,232,0.40)",
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
