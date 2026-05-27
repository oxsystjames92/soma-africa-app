import FadeUp from "./FadeUp";

export default function Hero() {
  return (
    <section
      className="grain"
      style={{
        paddingTop: "clamp(60px, 7vw, 110px)",
        paddingBottom: "clamp(80px, 9vw, 140px)",
        background:
          "radial-gradient(ellipse 70% 50% at 65% -5%, rgba(63,160,121,0.14) 0%, transparent 55%)," +
          "radial-gradient(ellipse 50% 70% at -4% 58%, rgba(14,40,28,0.70) 0%, transparent 60%)," +
          "radial-gradient(ellipse 35% 35% at 102% 85%, rgba(27,70,50,0.10) 0%, transparent 50%)," +
          "linear-gradient(160deg, #0d1a14 0%, #0a0f0d 40%, #080d0a 100%)",
      }}
      data-screen-label="01 Hero"
    >
      {/* Aurora blobs */}
      <div
        aria-hidden="true"
        className="aurora-blob"
        style={{ width: 600, height: 600, background: "rgba(63,160,121,0.10)", right: -120, top: -180, animationDuration: "18s" }}
      />
      <div
        aria-hidden="true"
        className="aurora-blob"
        style={{ width: 440, height: 440, background: "rgba(14,58,46,0.55)", left: -100, top: 100, animationDuration: "22s", animationDelay: "-8s" }}
      />
      <div
        aria-hidden="true"
        className="aurora-blob"
        style={{ width: 280, height: 280, background: "rgba(201,168,76,0.05)", right: "20%", bottom: "8%", animationDuration: "16s", animationDelay: "-11s" }}
      />

      {/* Bottom rule */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: "linear-gradient(to right, transparent 0%, var(--border) 50%, transparent 100%)",
        }}
      />

      <div className="wrap hero-grid" style={{ position: "relative", zIndex: 1 }}>
        {/* Left — copy */}
        <div>
          {/* Live badge */}
          <FadeUp delay={0}>
            <div
              className="badge-shine"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "7px 16px 7px 10px",
                background: "rgba(63,160,121,0.08)",
                border: "1px solid rgba(63,160,121,0.28)",
                borderRadius: 999,
                fontSize: 11.5, fontWeight: 600, color: "var(--em)",
                letterSpacing: "0.06em", marginBottom: 28,
                fontFamily: "var(--font-mono)",
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: "50%", background: "var(--em)",
                  animation: "pulse-dot 2.4s infinite", flexShrink: 0,
                }}
              />
              BUILT FOR UGANDA&apos;S PRIVATE SCHOOLS
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <h1
              className="display h-xxl"
              style={{ margin: "0 0 28px" }}
            >
              End-of-term reports go out.
              <br />
              <em>Parents never hear back.</em>
            </h1>
          </FadeUp>

          <FadeUp delay={0.16}>
            <p className="lead" style={{ marginBottom: 36 }}>
              Soma sends every parent a personal WhatsApp message the moment
              results are in — automatically, every term. No app to download.
              No login to create. No extra staff needed.
            </p>
          </FadeUp>

          <FadeUp delay={0.22}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#waitlist" className="btn btn-primary large">
                Join 47 Schools on the Waitlist <span className="arr">→</span>
              </a>
              <a href="#how" className="btn btn-outline large">
                How It Works
              </a>
            </div>
          </FadeUp>

          {/* Trust strip */}
          <FadeUp delay={0.30}>
            <div className="trust-strip">
              <div className="trust-item">
                <span className="trust-val">47+</span>
                <span className="trust-lbl">Schools waiting</span>
              </div>
              <div className="trust-item">
                <span className="trust-val">0</span>
                <span className="trust-lbl">Apps to install</span>
              </div>
              <div className="trust-item">
                <span className="trust-val">24h</span>
                <span className="trust-lbl">To onboard</span>
              </div>
              <div className="trust-item">
                <span className="trust-val">35%</span>
                <span className="trust-lbl">Founding discount</span>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* Right — phone mockup */}
        <div className="phone-col" aria-hidden="true">
          <div className="phone-stage">
            <div className="phone-glow" />

            <div className="floating-tag t1">
              <span className="dot" />
              Delivered · 2:14 PM
            </div>

            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                {/* WA Header */}
                <div className="wa-header">
                  <span style={{ fontSize: 17, opacity: 0.82 }}>‹</span>
                  <div className="wa-avatar">SA</div>
                  <div style={{ fontSize: 13, lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 600 }}>Soma Africa</div>
                    <div style={{ fontSize: 10, opacity: 0.76 }}>online</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 15, opacity: 0.72 }}>
                    <span>📹</span><span>📞</span>
                  </div>
                </div>

                <div className="wa-subheader">
                  <strong style={{ color: "#222" }}>St. Mary&apos;s College</strong> · S.3 West
                </div>

                <div className="wa-chat">
                  <div className="wa-date">Today</div>

                  <div className="bubble">
                    <div style={{ fontSize: 10, color: "#3fa079", fontWeight: 700, marginBottom: 4, letterSpacing: "0.02em" }}>
                      Soma Africa
                    </div>
                    <div style={{ fontSize: 10.5, color: "#075E54", fontWeight: 700, marginBottom: 4 }}>
                      📘 End-of-Term · Mathematics
                    </div>
                    <div style={{ fontSize: 13, color: "#111", fontWeight: 600, marginBottom: 6 }}>
                      Hello, Mr. Nakato — for <strong>Amina Nakato</strong>:
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 4px" }}>
                      <div style={{
                        fontFamily: "var(--font-mono, monospace)", fontWeight: 700,
                        fontSize: 28, lineHeight: 1, color: "#0a0f0d",
                        background: "#c9a84c", padding: "2px 8px", borderRadius: 4,
                      }}>68</div>
                      <div style={{ fontSize: 10, color: "#666", lineHeight: 1.35 }}>
                        / 100<br />
                        Class avg <strong style={{ color: "#333" }}>61</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, padding: "3px 0", color: "#444" }}>
                      <span>Trend</span>
                      <span style={{ color: "#128C4E", fontWeight: 600 }}>⬆ Up from 54</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, padding: "2px 0", color: "#444" }}>
                      <span>Class position</span>
                      <strong style={{ color: "#111" }}>11 / 38</strong>
                    </div>

                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8,
                      padding: "3px 8px", background: "#E6F4EA", borderRadius: 4,
                      fontSize: 10, color: "#128C4E", fontWeight: 600,
                    }}>
                      ✅ On Track
                    </div>

                    <div style={{
                      marginTop: 8, fontSize: 10, color: "#555", lineHeight: 1.45,
                      borderLeft: "2px solid #c9a84c", paddingLeft: 7,
                    }}>
                      Teacher Mukasa: <em>&ldquo;Strong improvement on algebra.&rdquo;</em>
                    </div>

                    <div style={{ fontSize: 9, color: "#999", textAlign: "right", marginTop: 4 }}>
                      2:14 PM <span style={{ color: "#4FC3F7", fontWeight: 700 }}>✓✓</span>
                    </div>
                  </div>

                  <div className="bubble out">
                    Thank you 🙏 We&apos;ve been waiting for this.
                    <div style={{ fontSize: 9, color: "#999", textAlign: "right", marginTop: 4 }}>
                      2:16 PM <span style={{ color: "#4FC3F7", fontWeight: 700 }}>✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-tag t2">
              <span className="dot" />
              No app required
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
