export default function Footer() {
  const year = new Date().getFullYear();

  const productLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "For Schools",  href: "#calculator"   },
    { label: "Pricing",      href: "#founding-schools" },
    { label: "Privacy Policy", href: "#" },
    { label: "Contact",      href: "#waitlist"     },
  ];

  return (
    <footer
      id="contact"
      style={{
        background: "#0D0D0D",
        borderTop: "2px solid #E5A019",
      }}
      data-screen-label="07 Footer"
    >
      <div className="wrap">
        <div className="footer-grid">
          {/* ── Column 1: Brand ── */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#E5A019",
                lineHeight: 1,
                marginBottom: 10,
              }}
            >
              SOMA
            </div>
            <div
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 14,
                fontStyle: "italic",
                color: "rgba(245,240,232,0.55)",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              Know your child. Every day.
            </div>
            <div
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 13,
                color: "rgba(245,240,232,0.30)",
                lineHeight: 1.7,
              }}
            >
              <a
                href="https://soma-africa.com"
                style={{
                  color: "rgba(245,240,232,0.30)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                soma-africa.com
              </a>
              <span>© {year} Soma Africa Limited</span>
            </div>
          </div>

          {/* ── Column 2: Product links ── */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: "rgba(245,240,232,0.30)",
                marginBottom: 20,
              }}
            >
              Product
            </h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {productLinks.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="footer-link">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: About ── */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: "rgba(245,240,232,0.30)",
                marginBottom: 20,
              }}
            >
              About
            </h4>
            <div
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 14,
                color: "rgba(245,240,232,0.45)",
                lineHeight: 1.8,
              }}
            >
              <div>Built in Uganda.</div>
              <div>Designed for Africa.</div>
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  fontSize: 12.5,
                  color: "rgba(245,240,232,0.25)",
                }}
              >
                A Decimus Advisory venture
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
