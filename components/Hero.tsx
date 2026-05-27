export default function Hero() {
  return (
    <section
      className="on-dark grain"
      style={{
        background:
          "radial-gradient(ellipse 75% 55% at 66% -6%, rgba(63,160,121,0.18) 0%, transparent 52%)," +
          "radial-gradient(ellipse 55% 75% at -4% 54%, rgba(14,58,46,0.72) 0%, transparent 58%)," +
          "radial-gradient(ellipse 38% 38% at 100% 82%, rgba(27,94,71,0.14) 0%, transparent 50%)," +
          "linear-gradient(155deg, #0E3A2E 0%, #07251B 34%, #051A13 64%, #04140F 100%)",
        paddingTop: "clamp(56px, 6vw, 100px)",
        paddingBottom: "clamp(90px, 10vw, 160px)",
        overflow: "hidden",
      }}
      data-screen-label="01 Hero"
    >
      {/* Aurora blobs */}
      {/* green-400 (#3FA079) top-right glow */}
      <div aria-hidden="true" className="aurora-blob" style={{ width: 640, height: 640, background: "rgba(63,160,121,0.13)", right: -160, top: -220, animationDuration: "16s" }} />
      {/* green-800 (#0E3A2E) left-side depth */}
      <div aria-hidden="true" className="aurora-blob" style={{ width: 480, height: 480, background: "rgba(14,58,46,0.60)", left: -120, top: 120, animationDuration: "20s", animationDelay: "-7s" }} />
      {/* green-500 (#237A5B) bottom-centre accent */}
      <div aria-hidden="true" className="aurora-blob" style={{ width: 320, height: 320, background: "rgba(35,122,91,0.09)", left: "35%", bottom: -60, animationDuration: "13s", animationDelay: "-4s" }} />
      {/* mustard accent preserved for badge / CTA contrast */}
      <div aria-hidden="true" className="aurora-blob" style={{ width: 260, height: 260, background: "rgba(229,160,25,0.07)", right: "18%", bottom: "10%", animationDuration: "18s", animationDelay: "-10s" }} />

      {/* Bottom mustard rule */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "linear-gradient(to right, transparent 0%, var(--mustard) 50%, transparent 100%)", opacity: 0.30 }} />

      <div
        className="wrap hero-inner"
        style={{
          position: "relative", zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1.08fr 0.92fr",
          gap: "clamp(40px, 5vw, 90px)",
          alignItems: "center",
        }}
      >
        {/* Left column — copy */}
        <div>
          {/* Live badge */}
          <div
            className="badge-shine reveal in-view"
            style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "8px 18px 8px 12px",
              background: "rgba(229,160,25,0.10)",
              border: "1px solid rgba(229,160,25,0.34)",
              borderRadius: 999,
              fontSize: 12, fontWeight: 600, color: "var(--mustard)",
              letterSpacing: "0.05em", marginBottom: 32,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mustard)", animation: "pulse-dot 2.2s infinite", flexShrink: 0 }} />
            Soma · for Uganda&apos;s private schools
          </div>

          <h1
            className="display h-xxl reveal d1 in-view"
            style={{ margin: "0 0 30px", color: "var(--white)" }}
          >
            Parents who feel <em>informed</em>
            <br />don&apos;t leave.
            <br />Parents who feel <em>ignored</em> do.
          </h1>

          <p
            className="reveal d2 in-view"
            style={{
              fontSize: "clamp(16.5px, 1.5vw, 20px)",
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.58,
              maxWidth: "52ch",
              margin: "0 0 40px",
            }}
          >
            Soma keeps every parent updated automatically — after every grade,
            every assessment, every term. No app. No login. Just a WhatsApp
            message.
          </p>

          <div className="reveal d3 in-view" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="#waitlist" className="btn large">
              Join the Waitlist <span className="arr">→</span>
            </a>
            <a href="#how" className="btn large ghost">
              See How It Works ↓
            </a>
          </div>

          {/* Stats strip */}
          <div className="hero-stats reveal d3 in-view">
            <div className="hero-stat">
              <span className="hero-stat-val">47+</span>
              <span className="hero-stat-lbl">Schools waiting</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-val">0</span>
              <span className="hero-stat-lbl">Apps to install</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-val">35%</span>
              <span className="hero-stat-lbl">Founding rate</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-val">24h</span>
              <span className="hero-stat-lbl">Onboarding reply</span>
            </div>
          </div>
        </div>

        {/* Right column — phone mockup */}
        <div className="phone-stage reveal d2 in-view" aria-hidden="true">
          <div className="floating-tag t1">
            <span className="dot" />
            Delivered · 2:14 PM
          </div>

          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="wa-header">
                <span style={{ fontSize: 18, opacity: 0.86 }}>‹</span>
                <div className="wa-avatar">
                  <svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 6 L52 44 L8 44 Z" fill="#073828" />
                    <path d="M14 26 L22 44 L6 44 Z" fill="#073828" fillOpacity="0.74" />
                    <path d="M46 18 L54 44 L38 44 Z" fill="#073828" fillOpacity="0.88" />
                  </svg>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.15 }}>
                  <div style={{ fontWeight: 600 }}>Soma Africa</div>
                  <div style={{ fontSize: 10.5, opacity: 0.78 }}>online</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 18, fontSize: 16, opacity: 0.74 }}>
                  <span>📹</span><span>📞</span>
                </div>
              </div>

              <div className="wa-subheader">
                <strong>St. Mary&apos;s College</strong> · S.3 West
              </div>

              <div className="wa-chat">
                <div className="wa-date">Today</div>
                <div className="bubble">
                  <div style={{ fontSize: 10.5, color: "var(--wa-green)", fontWeight: 700, marginBottom: 4 }}>
                    Soma Africa
                  </div>
                  <div style={{ fontSize: 11, color: "#075E54", fontWeight: 600, marginBottom: 4, letterSpacing: "0.01em" }}>
                    📘 Mid-Term Result · Mathematics
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--dark)", fontWeight: 600, marginBottom: 6 }}>
                    Hello, Mr. Nakato — for <strong>Amina Nakato</strong>:
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 4px" }}>
                    <div style={{ fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700, fontSize: 28, lineHeight: 1, color: "var(--dark)", background: "var(--mustard)", padding: "2px 8px", borderRadius: 5 }}>68</div>
                    <div style={{ fontSize: 10.5, color: "#666", lineHeight: 1.3 }}>
                      / 100<br />
                      <span>Class avg <strong style={{ color: "#222" }}>61</strong></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", color: "#444" }}>
                    <span>Trend</span>
                    <span style={{ color: "#128C4E", fontWeight: 600 }}>⬆ Improved from 54</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", color: "#444" }}>
                    <span>Class position</span>
                    <strong style={{ color: "var(--dark)", fontWeight: 600 }}>11 / 38</strong>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "4px 9px", background: "#E6F4EA", borderRadius: 5, fontSize: 10.5, color: "#128C4E", fontWeight: 600 }}>
                    ✅ On Track
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10.5, color: "#555", lineHeight: 1.4, borderLeft: "2px solid var(--mustard)", paddingLeft: 8 }}>
                    Teacher Mukasa: <em>&ldquo;Strong improvement on algebra — keep practicing word problems.&rdquo;</em>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#888", textAlign: "right", marginTop: 4 }}>
                    2:14 PM <span style={{ color: "#4FC3F7", fontWeight: 700 }}>✓✓</span>
                  </div>
                </div>

                <div className="bubble out">
                  Thank you 🙏 We&apos;ve been waiting for this.
                  <div style={{ fontSize: 9.5, color: "#888", textAlign: "right", marginTop: 4 }}>
                    2:16 PM <span style={{ color: "#4FC3F7", fontWeight: 700 }}>✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="floating-tag t2">
            <span className="dot" />
            Nothing to install
          </div>
        </div>
      </div>
    </section>
  );
}
