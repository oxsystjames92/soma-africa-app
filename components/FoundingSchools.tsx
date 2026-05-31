import FadeUp from "./FadeUp";

const SLOTS = [
  { label: "Founding School 1", confirmed: true  },
  { label: "Founding School 2", confirmed: true  },
  { label: "Founding School 3", confirmed: true  },
  { label: "Your School?",      confirmed: false },
  { label: "Your School?",      confirmed: false },
];

export default function FoundingSchools() {
  // Pull from env var — updated manually each week
  const waitlistCount =
    process.env.NEXT_PUBLIC_WAITLIST_COUNT ?? "47";

  return (
    <section
      id="founding-schools"
      style={{ background: "#0D0D0D" }}
      data-screen-label="05 Founding Schools"
    >
      <div className="wrap section-py">
        {/* Header */}
        <FadeUp>
          <div className="founding-head">
            <div>
              <span className="eyebrow">Founding schools</span>
              <h2 className="section-h2-dark">
                Join Uganda&apos;s{" "}
                <em style={{ color: "#E5A019" }}>founding schools.</em>
              </h2>
            </div>
            <p className="lead-dark" style={{ paddingTop: 8 }}>
              Early schools receive a lifetime enhanced commission rate and
              featured placement on this site.
            </p>
          </div>
        </FadeUp>

        {/* Live counter card */}
        <FadeUp delay={0.08}>
          <div className="founding-counter-card">
            <div className="founding-counter-num" aria-label={`${waitlistCount} schools on the waitlist`}>
              {waitlistCount}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  fontSize: "clamp(17px, 2vw, 22px)",
                  color: "#F5F0E8",
                  marginBottom: 8,
                  lineHeight: 1.2,
                }}
              >
                schools and directors already on the waitlist.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 13.5,
                  color: "rgba(245,240,232,0.45)",
                  lineHeight: 1.55,
                  maxWidth: "46ch",
                }}
              >
                After the five founding schools, the commission rate drops to
                20%. The founding rate is locked for the life of your
                contract.
              </div>
            </div>

            {/* Spot indicators */}
            <div
              className="spot-indicators"
              aria-label="3 of 5 founding spots confirmed"
            >
              {[true, true, true, false, false].map((filled, i) => (
                <div
                  key={i}
                  className={filled ? "spot-block spot-block-filled" : "spot-block spot-block-empty"}
                />
              ))}
              <span
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(245,240,232,0.35)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginLeft: 4,
                  whiteSpace: "nowrap",
                }}
              >
                3 confirmed · 2 remaining
              </span>
            </div>
          </div>
        </FadeUp>

        {/* School slots */}
        <FadeUp delay={0.14}>
          <div className="school-slots">
            {SLOTS.map(({ label, confirmed }, i) => (
              <div
                key={i}
                className={confirmed ? "school-slot school-slot-confirmed" : "school-slot school-slot-open"}
              >
                <div
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: confirmed ? "#0D0D0D" : "#E5A019",
                    lineHeight: 1,
                  }}
                >
                  {confirmed ? (i + 1) : "?"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: confirmed ? "rgba(13,13,13,0.80)" : "rgba(245,240,232,0.70)",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: confirmed ? "#0D0D0D" : "#E5A019",
                    opacity: 0.85,
                  }}
                >
                  {confirmed ? "Confirmed" : "Available"}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Urgency block */}
        <FadeUp delay={0.20}>
          <div className="urgency-block">
            <div>
              <div
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  fontSize: "clamp(17px, 2vw, 22px)",
                  color: "#E5A019",
                  marginBottom: 10,
                  lineHeight: 1.2,
                }}
              >
                Founding school spots: 3 of 5 confirmed.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "rgba(245,240,232,0.60)",
                  lineHeight: 1.6,
                  maxWidth: "54ch",
                }}
              >
                Founding schools earn{" "}
                <strong style={{ color: "#E5A019" }}>
                  35% lifetime commission
                </strong>{" "}
                versus 20% for schools that join after launch. This offer
                closes when we reach 5 founding schools — permanently.
              </div>
            </div>
            <a
              href="#waitlist"
              className="btn-primary btn-lg"
              style={{ flexShrink: 0 }}
            >
              Secure Your Founding Spot →
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
