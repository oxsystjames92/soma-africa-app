import FadeUp from "./FadeUp";

const STEPS = [
  {
    num:   "01",
    icon:  (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: "Teacher uploads grades",
    body:  "Structured Excel template. One upload per assessment. Two minutes per class. Works offline — syncs when connected.",
    tag:   "Excel → processed in 5 seconds",
  },
  {
    num:   "02",
    icon:  (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Soma calculates",
    body:  "Class average, personal trend vs previous assessment, performance status flag. Automatic. No manual analysis required.",
    tag:   "On Track · Needs Attention · Contact School",
  },
  {
    num:   "03",
    icon:  (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Parent receives WhatsApp",
    body:  "Plain-language progress update. No app to download. No login to remember. Delivered to any WhatsApp number worldwide.",
    tag:   "+ Email copy optional",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ background: "#0D0D0D" }}
      data-screen-label="03 How It Works"
    >
      <div className="wrap section-py">
        {/* Header */}
        <FadeUp>
          <div className="section-head">
            <div>
              <span className="eyebrow">The process</span>
              <h2 className="section-h2-dark">
                Three steps.
                <br />
                <em style={{ color: "#E5A019" }}>Sixty seconds.</em>
              </h2>
            </div>
            <p className="lead-dark" style={{ paddingTop: 8 }}>
              From grade entry to parent&apos;s WhatsApp in under a minute.
              Your staff uploads. Soma handles everything after that —
              formatting, sending, and tracking.
            </p>
          </div>
        </FadeUp>

        {/* Steps */}
        <div className="steps-grid" style={{ position: "relative" }}>
          {STEPS.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.10}>
              <div className="step-card" style={{ height: "100%" }}>
                {/* Number + Icon row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <div className="step-number">{step.num}</div>
                  <div style={{ color: "rgba(229,160,25,0.6)", marginTop: 8 }}>
                    {step.icon}
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    fontSize: "clamp(18px, 2vw, 22px)",
                    fontWeight: 700,
                    color: "#F5F0E8",
                    marginBottom: 12,
                    lineHeight: 1.25,
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 15,
                    color: "rgba(245,240,232,0.55)",
                    lineHeight: 1.65,
                    marginBottom: 0,
                  }}
                >
                  {step.body}
                </p>

                <div className="step-tag">{step.tag}</div>
              </div>
            </FadeUp>
          ))}

          {/* Connector arrows — desktop only */}
          {[0, 1].map((i) => (
            <div
              key={i}
              className="step-connector"
              style={{
                position: "absolute",
                top: 52,
                left: `calc(${(i + 1) * 33.33}% - 18px)`,
                color: "rgba(229,160,25,0.35)",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
