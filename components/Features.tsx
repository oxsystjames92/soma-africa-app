import FadeUp from "./FadeUp";

const features = [
  {
    icon: "📲",
    title: "Nothing to install — for anyone",
    body: "Parents receive on the WhatsApp they already use. No app to download. No account to create. No instructions needed. If they have WhatsApp, they get the report.",
  },
  {
    icon: "📶",
    title: "Works on every phone",
    body: "2G, 3G, or 4G. A Nokia feature phone or an iPhone. WhatsApp messages are tiny. If they run WhatsApp, the report gets through.",
  },
  {
    icon: "📋",
    title: "Full delivery receipts",
    body: "Know exactly which parents received the report, which read it, and which numbers need a follow-up. No guessing whether the message got through.",
  },
  {
    icon: "📈",
    title: "Term-over-term tracking",
    body: "Every result is stored. Parents see whether their child improved from the last term — in the same WhatsApp conversation. Nothing extra for you to build.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{ background: "var(--bg-base)" }}
      data-screen-label="04 Features"
    >
      <div className="section-divider" />

      <div className="wrap">
        <FadeUp>
          <div style={{ marginBottom: 52 }}>
            <span className="eyebrow" style={{ marginBottom: 18, display: "inline-flex" }}>
              What school directors get
            </span>
            <h2 className="display h-xl" style={{ marginTop: 16, maxWidth: "26ch" }}>
              Built for schools that don&apos;t have time for new software.
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="feature-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(18px, 1.6vw, 24px)",
                    fontWeight: 400,
                    color: "var(--tx-1)",
                    marginBottom: 12,
                    lineHeight: 1.25,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: "var(--tx-2)", fontSize: 15, lineHeight: 1.66 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
