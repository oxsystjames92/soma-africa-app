import FadeUp from "./FadeUp";

const steps = [
  {
    num: "01",
    title: "Teacher uploads the grades",
    body: "Export from your marks register or type results into a simple spreadsheet. Soma accepts Excel, Google Sheets, or CSV. Two minutes per class — done from any device.",
    tag: "2 min per class",
  },
  {
    num: "02",
    title: "Soma formats every report",
    body: "Each student's result is turned into a clear, personal message — with their score, class average, position, and teacher comment. Every parent gets a different message.",
    tag: "Automatic · instant",
  },
  {
    num: "03",
    title: "Parents receive on WhatsApp",
    body: "One message per parent, per subject, per term. Delivered to the phone number in your school's contacts. No app to download. No account to create.",
    tag: "WhatsApp · no app",
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
        <FadeUp>
          <div className="calc-head">
            <div>
              <span className="eyebrow">The process</span>
              <h2 className="display h-xl" style={{ marginTop: 16 }}>
                Three steps.
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
                  <p
                    style={{
                      color: "var(--tx-2)",
                      fontSize: 15.5,
                      lineHeight: 1.65,
                      maxWidth: "56ch",
                    }}
                  >
                    {step.body}
                  </p>
                  <div
                    style={{
                      marginTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.16em",
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
