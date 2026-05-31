import FadeUp from "./FadeUp";

export default function Hero() {
  return (
    <section
      id="hero"
      style={{ background: "#0D0D0D" }}
      data-screen-label="01 Hero"
    >
      <div
        className="wrap"
        style={{
          paddingTop: "clamp(100px, 14vw, 160px)",
          paddingBottom: "clamp(72px, 10vw, 128px)",
        }}
      >
        {/* ── Two-column layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "clamp(56px, 7vw, 96px)",
            alignItems: "center",
          }}
          className="lg:grid-cols-[1fr_auto]"
        >
          {/* Text column */}
          <div style={{ maxWidth: 640 }}>
            <FadeUp>
              <span className="eyebrow">
                Grade Intelligence · Parent Notifications · Uganda
              </span>
            </FadeUp>

            <FadeUp delay={0.07}>
              <h1
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  fontSize: "clamp(36px, 5.5vw, 68px)",
                  fontWeight: 900,
                  color: "#F5F0E8",
                  lineHeight: 1.08,
                  margin: "0 0 24px",
                }}
              >
                Parents who feel{" "}
                <span
                  style={{
                    textDecoration: "underline",
                    textDecorationColor: "#E5A019",
                    textDecorationThickness: 4,
                    textUnderlineOffset: 6,
                  }}
                >
                  informed
                </span>{" "}
                don&apos;t leave.
                <br />
                Parents who feel{" "}
                <span
                  style={{
                    textDecoration: "underline",
                    textDecorationColor: "#E5A019",
                    textDecorationThickness: 4,
                    textUnderlineOffset: 6,
                  }}
                >
                  ignored
                </span>{" "}
                do.
              </h1>
            </FadeUp>

            <FadeUp delay={0.13}>
              <p
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: "clamp(16px, 1.8vw, 19px)",
                  color: "rgba(245,240,232,0.60)",
                  lineHeight: 1.72,
                  margin: "0 0 40px",
                  maxWidth: "52ch",
                }}
              >
                Soma keeps every parent updated automatically — after every
                grade, every assessment, every term. No app. No login. Just
                a WhatsApp message.
              </p>
            </FadeUp>

            <FadeUp delay={0.19}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <a href="#waitlist" className="btn-primary btn-lg">
                  Join the Waitlist →
                </a>
                <a href="#how-it-works" className="btn-ghost btn-lg">
                  See How It Works
                </a>
              </div>
            </FadeUp>
          </div>

          {/* Phone mockup column */}
          <FadeUp delay={0.10}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <WhatsAppMockup />
              <p
                style={{
                  fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "rgba(245,240,232,0.32)",
                  textAlign: "center",
                  maxWidth: "30ch",
                }}
              >
                Delivered to parent&apos;s WhatsApp within 60 seconds of grade
                entry.
              </p>
            </div>
          </FadeUp>
        </div>

        {/* Scroll indicator */}
        <FadeUp delay={0.35}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "clamp(48px, 6vw, 80px)",
            }}
          >
            <a
              href="#problem"
              aria-label="Scroll to next section"
              className="animate-float"
              style={{ color: "rgba(245,240,232,0.25)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function WhatsAppMockup() {
  const rows = [
    { label: "Student",       value: "Amina Nakato" },
    { label: "Assessment",    value: "Mid-Term Mathematics" },
    { label: "Score",         value: "68 / 100" },
    { label: "Class Average", value: "61 / 100" },
    { label: "Trend",         value: "⬆ Improved from 54" },
  ];

  return (
    <div
      style={{
        width: 300,
        background: "#1A1A1A",
        borderRadius: 36,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {/* Phone screen */}
      <div
        style={{
          background: "#ECE5DD",
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        {/* WhatsApp header */}
        <div
          style={{
            background: "#128C7E",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "#E5A019",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-dmsans), sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#0D0D0D",
              flexShrink: 0,
            }}
          >
            SA
          </div>
          <div>
            <div
              style={{
                color: "#FFF",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              📱 Soma Africa
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 11,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              online
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div
          style={{
            padding: "12px 10px 16px",
            minHeight: 296,
            background: "#E5DDD5",
          }}
        >
          {/* Message bubble */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "0 10px 10px 10px",
              padding: "10px 12px",
              maxWidth: "92%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#128C7E",
                marginBottom: 4,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              📱 Soma Africa
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#888",
                marginBottom: 10,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              St. Mary&apos;s College · S.3 West
            </div>

            {rows.map(({ label, value }, i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid #F2EFEB" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "#888",
                    fontFamily: "var(--font-dmsans), sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#1A1A1A",
                    fontFamily: "var(--font-dmsans), sans-serif",
                    textAlign: "right",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}

            {/* Status */}
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#D4EDDA",
                color: "#155724",
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 100,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              ✅ On Track
            </div>

            {/* Timestamp */}
            <div
              style={{
                textAlign: "right",
                fontSize: 9,
                color: "#AAAAAA",
                marginTop: 6,
                fontFamily: "var(--font-dmsans), sans-serif",
              }}
            >
              Today · 2:14 PM ✓✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
