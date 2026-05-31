import FadeUp from "./FadeUp";

const cards = [
  {
    icon:    "🏫",
    iconBg:  "rgba(229,160,25,0.12)",
    role:    "Director",
    roleBg:  "#E5A019",
    roleClr: "#0D0D0D",
    accent:  "accent-mustard",
    pain:    "Parents only find out their child is struggling at end-of-term. By then, three families have already left for a school that communicates better.",
    quote:   "We lose students to perception, not performance.",
  },
  {
    icon:    "📋",
    iconBg:  "rgba(34,197,94,0.12)",
    role:    "Head Teacher",
    roleBg:  "#22C55E",
    roleClr: "#FFFFFF",
    accent:  "accent-green",
    pain:    "End-of-term report week. Three days chasing teachers for marks, fixing spreadsheet errors, and working weekends to compile 800 report cards manually.",
    quote:   "I lose my weekends every December.",
  },
  {
    icon:    "👨‍👧",
    iconBg:  "rgba(59,130,246,0.12)",
    role:    "Parent / Guardian",
    roleBg:  "#3B82F6",
    roleClr: "#FFFFFF",
    accent:  "accent-blue",
    pain:    "The school has your child for 8 hours a day, 5 days a week. You hear absolutely nothing until December. Or until something goes wrong.",
    quote:   "I didn’t know she was failing until it was too late to do anything about it.",
  },
];

export default function ProblemValidation() {
  return (
    <section
      id="problem"
      style={{ background: "#FAF3E0" }}
      data-screen-label="02 The Problem"
    >
      <div className="wrap section-py">
        {/* Header */}
        <FadeUp>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto clamp(48px,6vw,72px)" }}>
            <span
              className="eyebrow"
              style={{ color: "#B97F0E" }}
            >
              The problem
            </span>
            <h2
              className="section-h2-light"
              style={{ marginBottom: 16 }}
            >
              Your parents don&apos;t know.
            </h2>
            <p className="lead-light">
              Three stakeholders. One shared problem. No existing solution.
            </p>
          </div>
        </FadeUp>

        {/* Pain cards */}
        <div className="pain-grid">
          {cards.map((card, i) => (
            <FadeUp key={card.role} delay={i * 0.08}>
              <div className={`pain-card ${card.accent}`} style={{ height: "100%" }}>
                {/* Icon */}
                <div
                  className="pain-icon"
                  style={{ background: card.iconBg }}
                >
                  <span role="img" aria-hidden="true">{card.icon}</span>
                </div>

                {/* Role badge */}
                <span
                  className="role-badge"
                  style={{
                    background: card.roleBg,
                    color:      card.roleClr,
                  }}
                >
                  {card.role}
                </span>

                {/* Pain */}
                <p
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 15,
                    color: "rgba(13,13,13,0.72)",
                    lineHeight: 1.65,
                    marginBottom: 20,
                  }}
                >
                  {card.pain}
                </p>

                {/* Quote */}
                <blockquote
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontStyle: "italic",
                    fontSize: 15,
                    color: "#0D0D0D",
                    borderLeft: "3px solid #E5A019",
                    paddingLeft: 14,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;{card.quote}&rdquo;
                </blockquote>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
