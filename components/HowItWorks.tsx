import FadeUp from "./FadeUp";

const steps = [
  {
    num: "01",
    title: "Upload your results",
    body: "Export from your marks register or type grades into a simple spreadsheet. Soma accepts Excel, Google Sheets, or CSV. No reformatting needed.",
    tag: "2 min per class",
  },
  {
    num: "02",
    title: "Soma formats every report",
    body: "Each student's result is turned into a personal message — with their score, class average, position, and teacher comment. Every parent gets a different message.",
    tag: "Automatic",
  },
  {
    num: "03",
    title: "Parents receive on WhatsApp",
    body: "One message per parent, per subject, per term. Delivered to the phone number in your contacts. No app. No account. No instructions for parents.",
    tag: "WhatsApp · instant",
  },
  {
    num: "04",
    title: "You see the delivery report",
    body: "Your Soma dashboard shows exactly who received the message, who read it, and who may need a follow-up call. Nothing falls through the gaps.",
    tag: "Full visibility",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how"
      style={{ background: "var(--bg-base)" }}
      data-screen-label="03 How It Works"
    >
      <div className="section-divider" />

      <div className="wrap">
        {/* Header */}
        <FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "clamp(24px, 4vw, 60px)",
              alignItems: "end",
              marginBottom: 64,
            }}
          >
            <div>
              <span className="eyebrow" style={{ marginBottom: 18, display: "inline-flex" }}>
                The process
              </span>
              <h2 className="display h-xl" style={{ marginTop: 16 }}>
                Four steps.
                <br />
                <em>No training required.</em>
              </h2>
            </div>
            <p className="lead">
              Your staff uploads the grades. Soma handles everything after
              that — formatting, sending, and tracking. No one on your team
              needs to learn new software.
            </p>
          </div>
        </FadeUp>

        {/* Steps */}
        <div className="steps-vertical">
          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.08}>
              <div className="step-row">
                <div>
                  <div className="step-num-badge">{step.num}</div>
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(20px, 2vw, 28px)",
                      fontWeight: 400,
                      color: "var(--tx-1)",
                      marginBottom: 10,
                      lineHeight: 1.2,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ color: "var(--tx-2)", fontSize: 15.5, lineHeight: 1.65, maxWidth: "56ch" }}>
                    {step.body}
                  </p>
                  <div
                    style={{
                      marginTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--em)",
                      background: "rgba(63,160,121,0.08)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "5px 10px",
                    }}
                  >
                    {step.tag}
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
