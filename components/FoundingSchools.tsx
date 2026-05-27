const schools = [
  { initial: "K", name: "Kampala Junior", confirmed: true },
  { initial: "N", name: "Nakasero Hill",  confirmed: true },
  { initial: "E", name: "Entebbe Heights", confirmed: true },
  { initial: "?", name: "Your School?",   confirmed: false },
  { initial: "?", name: "Your School?",   confirmed: false },
];

export default function FoundingSchools() {
  return (
    <section className="on-dark grain" id="schools" data-screen-label="05 Founding schools">
      <div className="section-rule" aria-hidden="true" />
      <span className="section-ordinal" aria-hidden="true">04</span>
      <div className="wrap">
        {/* Head */}
        <div
          className="founding-head"
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 60, alignItems: "end", marginBottom: 60,
          }}
        >
          <div>
            <span className="eyebrow">04 — Founding schools</span>
            <h2 className="display h-xl" style={{ margin: "18px 0 0", color: "var(--white)" }}>
              Join Uganda&apos;s <em>founding schools.</em>
            </h2>
          </div>
          <p className="lead">
            Five founding schools. A 35% rate locked for life — versus 20% for
            every school after. Three are signed. Two remain.
          </p>
        </div>

        {/* Counter card */}
        <div
          className="counter-card-inner"
          style={{
            background: "var(--dark-2)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 32, padding: "36px 40px",
            display: "grid", gridTemplateColumns: "auto 1fr auto",
            gap: 36, alignItems: "center", marginBottom: 40,
          }}
        >
          <div
            className="counter-number"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
              fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            47
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <div
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                fontSize: 22, color: "var(--white)", marginBottom: 8, lineHeight: 1.15,
              }}
            >
              schools on the waitlist.
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.62)", maxWidth: "44ch" }}>
              After the five founding schools, the rate drops to 20%. The founding
              rate is locked for the life of your contract.
            </div>
          </div>
          <div
            className="spots-row"
            style={{ display: "flex", gap: 6, alignItems: "center" }}
            aria-label="3 of 5 founding spots taken"
          >
            {[true, true, true, false, false].map((filled, i) => (
              <div
                key={i}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: filled ? "var(--mustard)" : "rgba(255,255,255,0.10)",
                  border: `1.5px solid ${filled ? "var(--mustard)" : "rgba(255,255,255,0.18)"}`,
                  boxShadow: filled ? "0 0 12px rgba(229,160,25,0.4)" : "none",
                }}
              />
            ))}
            <span
              style={{
                fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em",
                textTransform: "uppercase", marginLeft: 8, fontWeight: 700,
              }}
            >
              3 of 5
            </span>
          </div>
        </div>

        {/* School grid */}
        <div className="school-grid">
          {schools.map(({ initial, name, confirmed }, i) => (
            <div key={i} className={`school ${confirmed ? "confirmed" : "open"}`}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                    fontSize: 32, lineHeight: 1,
                    color: confirmed ? "var(--dark)" : "var(--mustard)", marginBottom: 6,
                  }}
                >
                  {initial}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>{name}</div>
                <div
                  style={{
                    fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase",
                    fontWeight: 700, marginTop: 8, opacity: 0.9,
                  }}
                >
                  {confirmed ? "Confirmed" : "Open"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Urgency block */}
        <div
          className="urgency-row"
          style={{
            display: "grid", gridTemplateColumns: "1fr auto",
            gap: 30, alignItems: "center",
            padding: "30px 36px",
            background: "linear-gradient(135deg, rgba(229,160,25,0.10), transparent 70%)",
            border: "1px solid rgba(229,160,25,0.32)",
            borderRadius: 22,
          }}
        >
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.88)" }}>
            <span
              style={{
                color: "var(--mustard)", fontWeight: 700,
                fontFamily: "var(--font-playfair, Georgia, serif)", fontSize: 22,
                lineHeight: 1.2, display: "block", marginBottom: 8,
              }}
            >
              3 of 5 founding spots confirmed.
            </span>
            Founding schools earn{" "}
            <strong style={{ color: "var(--mustard)" }}>35% lifetime commission</strong> versus 20%
            standard. This offer closes at 5 schools.
          </div>
          <a href="#waitlist" className="btn large">
            Secure Your Founding Spot <span className="arr">→</span>
          </a>
        </div>
      </div>

    </section>
  );
}
