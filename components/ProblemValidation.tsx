import FadeUp from "./FadeUp";

const pains = [
  {
    icon: "01",
    quote: "We print 400 report slips every term. At least half are never picked up from the office.",
    stat: "~50%",
    statLabel: "of printed reports never collected",
  },
  {
    icon: "02",
    quote: "Parents call us because they don't know their child's grade. We spend days answering the same questions.",
    stat: "3–5 days",
    statLabel: "of staff time lost to parent calls",
  },
  {
    icon: "03",
    quote: "I sent the same message to 38 parents this term. One by one. Manually. There has to be a better way.",
    stat: "600+",
    statLabel: "individual WhatsApp messages per term",
  },
];

export default function ProblemValidation() {
  return (
    <section
      id="problem"
      style={{ background: "var(--bg-alt)" }}
      data-screen-label="02 Problem"
    >
      <div className="section-divider" />

      <div className="wrap">
        <FadeUp>
          <div style={{ marginBottom: 56 }}>
            <span className="eyebrow" style={{ marginBottom: 18, display: "inline-flex" }}>
              The same problem, every term
            </span>
            <h2 className="display h-xl" style={{ marginTop: 16, maxWidth: "20ch" }}>
              Sound familiar?
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="pain-grid">
            {pains.map((p) => (
              <div key={p.icon} className="pain-card">
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--tx-3)",
                    marginBottom: 20,
                  }}
                >
                  {p.icon}
                </div>

                <blockquote
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(17px, 1.5vw, 21px)",
                    lineHeight: 1.45,
                    color: "var(--tx-1)",
                    fontStyle: "italic",
                    marginBottom: 28,
                    borderLeft: "2px solid var(--border)",
                    paddingLeft: 16,
                  }}
                >
                  &ldquo;{p.quote}&rdquo;
                </blockquote>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--gold)",
                      lineHeight: 1,
                    }}
                  >
                    {p.stat}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--tx-3)", lineHeight: 1.4 }}>
                    {p.statLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.18}>
          <p
            style={{
              marginTop: 44,
              fontSize: 15,
              color: "var(--tx-2)",
              borderLeft: "2px solid var(--em)",
              paddingLeft: 18,
              maxWidth: "56ch",
              lineHeight: 1.65,
            }}
          >
            If any of these sound like your school, Soma was built for you.
            The problem is not your staff. It is the absence of a system that
            runs without them.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
