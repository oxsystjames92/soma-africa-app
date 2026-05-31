export default function Footer() {
  return (
    <footer className="footer-root" id="contact" data-screen-label="07 Footer">
      <div className="wrap">
        <div className="footer-3col">
          {/* Brand */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "var(--tx-1)",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              SOMA<span style={{ color: "var(--em)" }}>.</span>AFRICA
            </div>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--tx-2)",
                lineHeight: 1.45,
                maxWidth: "22ch",
                marginBottom: 18,
              }}
            >
              The end-of-term reporting system that runs itself.
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--tx-3)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Built in Uganda &nbsp;·&nbsp; Designed for Africa
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--tx-3)",
                marginBottom: 18,
              }}
            >
              Product
            </h4>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "How It Works", href: "#how" },
                { label: "Features",     href: "#features" },
                { label: "Join Waitlist",href: "#waitlist" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="footer-link">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--tx-3)",
                marginBottom: 18,
              }}
            >
              Connect
            </h4>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <li>
                <a
                  href="https://wa.me/256700000000"
                  className="footer-link"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span style={{ fontSize: 16 }}>💬</span> WhatsApp Us
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/company/soma-africa"
                  className="footer-link"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span style={{ fontSize: 14 }}>in</span> LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-3)",
              letterSpacing: "0.08em",
            }}
          >
            © 2025 Soma Africa Limited &nbsp;·&nbsp; soma-africa.com
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-3)",
              letterSpacing: "0.08em",
              display: "flex",
              gap: 16,
            }}
          >
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
