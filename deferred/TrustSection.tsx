// DEFERRED: Phase 2/3 — social proof section; restore once real testimonials and stats exist
import FadeUp from "./FadeUp";

const stats = [
  { val: "47+", label: "Schools on the waitlist" },
  { val: "35%", label: "Founding school discount" },
  { val: "< 1 day", label: "Average onboarding time" },
];

export default function TrustSection() {
  return (
    <section
      id="trust"
      style={{ background: "var(--bg-base)" }}
      data-screen-label="05 Trust"
    >
      <div className="section-divider" />

      <div className="wrap">
        {/* Stats */}
        <FadeUp>
          <div className="stat-bar">
            {stats.map((s) => (
              <div key={s.label} className="stat-cell">
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(32px, 4vw, 52px)",
                    fontWeight: 700,
                    color: "var(--gold)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    marginBottom: 10,
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--tx-3)",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Quote */}
        <FadeUp delay={0.12}>
          <div
            style={{
              maxWidth: 680,
              padding: "40px 44px",
              background: "var(--bg-alt)",
              border: "1px solid var(--border-2)",
              borderRadius: 14,
              borderLeft: "3px solid var(--em)",
            }}
          >
            <blockquote
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(19px, 1.8vw, 26px)",
                fontStyle: "italic",
                color: "var(--tx-1)",
                lineHeight: 1.52,
                marginBottom: 24,
              }}
            >
              &ldquo;I send 600 WhatsApp messages every term — one at a time.
              If I could do it automatically, I wouldn&apos;t need a second
              office assistant.&rdquo;
            </blockquote>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(63,160,121,0.15)",
                  border: "1px solid var(--border)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  color: "var(--em)",
                }}
              >
                HT
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-1)" }}>
                  Head Teacher
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--tx-3)",
                    letterSpacing: "0.1em",
                    marginTop: 2,
                  }}
                >
                  PRIVATE SCHOOL · KAMPALA
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
