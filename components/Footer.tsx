import { SomaMark } from "./SomaLogo";

export default function Footer() {
  return (
    <footer
      id="contact"
      style={{
        background: "var(--dark)",
        color: "var(--parchment)",
        padding: "80px 0 36px",
        borderTop: "4px solid var(--mustard)",
        position: "relative",
      }}
    >
      <div className="wrap">
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr",
            gap: 40,
            marginBottom: 60,
          }}
        >
          {/* Brand column */}
          <div>
            <div className="soma-lockup" aria-hidden="true">
              <SomaMark size={64} />
              <span className="wm">
                SOMA<span className="bar" />
              </span>
            </div>
            <p className="soma-tagline">
              Know your child. <em>Everyday.</em>
            </p>
            <a
              href="https://soma-africa.com"
              style={{
                fontSize: 13, color: "var(--mustard)", marginTop: 16,
                letterSpacing: "0.04em", display: "inline-block",
                borderBottom: "1px solid rgba(229,160,25,0.36)", paddingBottom: 1,
              }}
            >
              soma-africa.com
            </a>
          </div>

          {/* Product links */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                fontSize: 16, letterSpacing: "-0.005em",
                color: "var(--white)", margin: "0 0 18px",
              }}
            >
              Product
            </h4>
            <ul
              style={{
                listStyle: "none", padding: 0, margin: 0,
                display: "flex", flexDirection: "column", gap: 12,
                fontSize: 15, color: "rgba(255,255,255,0.66)",
              }}
            >
              {[
                { label: "How It Works", href: "#how" },
                { label: "For Schools",  href: "#schools" },
                { label: "Pricing",      href: "#pricing" },
                { label: "Join Waitlist",href: "#waitlist" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="footer-link">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Soma / built */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                fontSize: 16, color: "var(--white)", margin: "0 0 18px",
              }}
            >
              Soma
            </h4>
            <p
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                fontStyle: "italic", fontSize: 18, color: "var(--white)",
                lineHeight: 1.3, maxWidth: "26ch", marginBottom: 14,
              }}
            >
              Built in Uganda.{" "}
              <em style={{ color: "var(--mustard)", fontStyle: "italic" }}>Designed for Africa.</em>
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", letterSpacing: "0.04em" }}>
              A Decimus Advisory venture · © 2025 Soma Africa Limited
            </p>
          </div>
        </div>

        <div
          className="footer-bottom"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12.5, color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>© 2025 Soma Africa Limited · soma-africa.com</span>
          <span style={{ color: "var(--mustard)", letterSpacing: "0.04em" }}>
            Privacy · Terms · Contact
          </span>
        </div>
      </div>

    </footer>
  );
}
