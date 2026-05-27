const pains = [
  {
    icon: "D",
    role: "The Director",
    title: "Enrollment leaks every term.",
    body: "Parents only learn their child is struggling at end-of-term. By then, three families have already moved their kids — quietly, without notice.",
    quote: "By the time I see the report, I've already lost them.",
  },
  {
    icon: "H",
    role: "The Head Teacher",
    title: "Report week is three days lost.",
    body: "Chasing teachers for marks, fixing errors in spreadsheets, retyping comments, working through the weekend. Every term. Same crisis.",
    quote: "I lose three working days every term to reports — and parents read them once.",
  },
  {
    icon: "P",
    role: "The Parent",
    title: "Eight months of silence.",
    body: "The school has your child for eight hours a day. You hear nothing until December. Then you hear everything at once — and it's too late to act.",
    quote: "I find out my son is failing in December. He's been struggling since September.",
  },
];

export default function Problem() {
  return (
    <section className="on-light" id="problem" data-screen-label="02 Problem" style={{ background: "var(--parchment)" }}>
      {/* decorative ordinal */}
      <span className="section-ordinal" aria-hidden="true">01</span>
      <div className="wrap">
        <div
          className="problem-head"
          style={{
            display: "grid",
            gridTemplateColumns: "0.85fr 1.15fr",
            gap: "clamp(30px, 5vw, 90px)",
            alignItems: "end",
            marginBottom: 70,
          }}
        >
          <div>
            <span className="eyebrow">01 — The problem</span>
          </div>
          <h2
            className="display h-xl reveal"
            style={{ margin: "14px 0 0", color: "var(--ink)" }}
          >
            Your parents <em>don&apos;t know.</em>
          </h2>
        </div>

        <div
          className="pain-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 22,
          }}
        >
          {pains.map(({ icon, role, title, body, quote }, i) => (
            <article
              key={role}
              className={`pain-card reveal d${i + 1}`}
              style={{
                background: "var(--white)",
                border: "1px solid var(--parchment-edge)",
                borderRadius: 22,
                padding: "36px 30px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                transition: "transform 280ms var(--ease), box-shadow 280ms var(--ease)",
              }}
            >
              <div
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "var(--mustard)", color: "var(--dark)",
                  display: "grid", placeItems: "center",
                  fontSize: 24, fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 700,
                }}
              >
                {icon}
              </div>

              <span
                style={{
                  fontSize: 11.5, letterSpacing: "0.2em", textTransform: "uppercase",
                  fontWeight: 700, color: "var(--mustard-deep)",
                }}
              >
                {role}
              </span>

              <h3
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 700, fontSize: 26, lineHeight: 1.15, margin: 0, color: "var(--ink)",
                }}
              >
                {title}
              </h3>

              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.55 }}>
                {body}
              </p>

              <blockquote
                style={{
                  margin: "8px 0 0", padding: "16px 18px",
                  background: "var(--mustard-tint)",
                  borderLeft: "3px solid var(--mustard)",
                  borderRadius: 8,
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontStyle: "italic", fontSize: 16, lineHeight: 1.45, color: "var(--dark)",
                }}
              >
                &ldquo;{quote}&rdquo;
              </blockquote>
            </article>
          ))}
        </div>
      </div>

    </section>
  );
}
