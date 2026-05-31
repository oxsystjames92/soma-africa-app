import FadeUp from "./FadeUp";

const schools = [
  { initial: "K", name: "Kampala Junior",  confirmed: true  },
  { initial: "N", name: "Nakasero Hill",   confirmed: true  },
  { initial: "E", name: "Entebbe Heights", confirmed: true  },
  { initial: "?", name: "Your School?",    confirmed: false },
  { initial: "?", name: "Your School?",    confirmed: false },
];

export default function FoundingSchools() {
  return (
    <section
      id="schools"
      style={{ background: "var(--bg-base)" }}
      data-screen-label="05 Founding Schools"
    >
      <div className="section-divider" />
      <div className="wrap">
        {/* Header */}
        <FadeUp>
          <div className="founding-head">
            <div>
              <span className="eyebrow">Founding schools</span>
              <h2 className="display h-xl" style={{ marginTop: 16 }}>
                Join Uganda&apos;s <em>founding five.</em>
              </h2>
            </div>
            <p className="lead">
              Five founding schools. A 35% rate locked for life — versus 20%
              for every school after. Three are signed. Two spots remain.
            </p>
          </div>
        </FadeUp>

        {/* Counter card */}
        <FadeUp delay={0.08}>
          <div className="founding-counter">
            <div className="founding-counter-num">47</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(17px, 1.8vw, 22px)",
                  color: "var(--tx-1)",
                  marginBottom: 8,
                  lineHeight: 1.2,
                }}
              >
                schools on the waitlist.
              </div>
              <div style={{ fontSize: 13.5, color: "var(--tx-2)", maxWidth: "44ch", lineHeight: 1.55 }}>
                After the five founding schools, the commission rate drops to 20%.
                The founding rate is locked for the life of your contract.
              </div>
            </div>

            <div
              className="spots-row"
              aria-label="3 of 5 founding spots taken"
            >
              {[true, true, true, false, false].map((filled, i) => (
                <div
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: filled ? "var(--gold)" : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${filled ? "var(--gold)" : "var(--border-2)"}`,
                    boxShadow: filled ? "0 0 10px rgba(201,168,76,0.35)" : "none",
                  }}
                />
              ))}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--tx-3)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginLeft: 6,
                  whiteSpace: "nowrap",
                }}
              >
                3 of 5
              </span>
            </div>
          </div>
        </FadeUp>

        {/* School grid */}
        <FadeUp delay={0.14}>
          <div className="school-grid">
            {schools.map(({ initial, name, confirmed }, i) => (
              <div
                key={i}
                className={`school-slot ${confirmed ? "confirmed" : "open"}`}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 28,
                    lineHeight: 1,
                    color: confirmed ? "var(--bg-base)" : "var(--em)",
                    marginBottom: 8,
                  }}
                >
                  {initial}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginTop: 8,
                    opacity: 0.85,
                  }}
                >
                  {confirmed ? "Confirmed" : "Open"}
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
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(17px, 1.8vw, 22px)",
                  color: "var(--gold)",
                  lineHeight: 1.2,
                  marginBottom: 10,
                }}
              >
                3 of 5 founding spots confirmed.
              </div>
              <div style={{ fontSize: 15, color: "var(--tx-2)", lineHeight: 1.6 }}>
                Founding schools earn{" "}
                <strong style={{ color: "var(--gold)" }}>35% lifetime commission</strong>{" "}
                versus 20% standard. This offer closes at 5 schools — permanently.
              </div>
            </div>
            <a href="#waitlist" className="btn btn-primary large" style={{ flexShrink: 0 }}>
              Secure Your Spot <span className="arr">→</span>
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
