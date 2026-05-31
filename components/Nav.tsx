"use client";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "How It Works",  href: "#how-it-works" },
  { label: "For Schools",   href: "#calculator" },
  { label: "Pricing",       href: "#founding-schools" },
  { label: "Contact",       href: "#waitlist" },
];

export default function Nav() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      {/* ── Main bar ── */}
      <nav
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 50,
          transition: "background 0.3s ease, border-bottom 0.3s ease",
          background: scrolled ? "#0D0D0D" : "transparent",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid transparent",
        }}
        aria-label="Main navigation"
      >
        <div
          className="wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          {/* Logo */}
          <a
            href="#hero"
            aria-label="Soma Africa — home"
            style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}
          >
            <span
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#E5A019",
                lineHeight: 1,
              }}
            >
              SOMA
            </span>
            <span
              style={{
                fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                fontSize: 9,
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                lineHeight: 1,
                marginTop: 5,
              }}
            >
              Know your child. Every day.
            </span>
          </a>

          {/* Desktop links */}
          <ul
            className="hidden md:flex"
            style={{ alignItems: "center", gap: 36 }}
          >
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  style={{
                    fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#E5A019"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right: CTA (always visible) + hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="#waitlist"
              className="btn-primary"
              style={{ padding: "10px 18px", fontSize: 13 }}
            >
              Join Waitlist
            </a>

            <button
              className="md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 5,
                width: 40,
                height: 40,
                padding: "8px 6px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    width: 22,
                    height: 2,
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    transform:
                      menuOpen && i === 0 ? "rotate(45deg) translateY(7px)"  :
                      menuOpen && i === 2 ? "rotate(-45deg) translateY(-7px)" :
                      "none",
                    opacity: menuOpen && i === 1 ? 0 : 1,
                  }}
                />
              ))}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "#0D0D0D",
          display: "flex",
          flexDirection: "column",
          paddingTop: 96,
          paddingLeft: "clamp(20px, 5vw, 48px)",
          paddingRight: "clamp(20px, 5vw, 48px)",
          transition: "opacity 0.3s ease, visibility 0.3s",
          opacity: menuOpen ? 1 : 0,
          visibility: menuOpen ? "visible" : "hidden",
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        <ul style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 40 }}>
          {NAV_LINKS.map(({ label, href }, i) => (
            <li key={href}>
              <a
                href={href}
                onClick={close}
                style={{
                  display: "block",
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  fontSize: "clamp(26px, 7vw, 38px)",
                  fontWeight: 700,
                  color: i === 0 ? "#E5A019" : "rgba(245,240,232,0.85)",
                  padding: "14px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#E5A019"; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = i === 0
                    ? "#E5A019"
                    : "rgba(245,240,232,0.85)";
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#waitlist"
          className="btn-primary btn-lg btn-full"
          onClick={close}
        >
          Join the Waitlist →
        </a>
      </div>
    </>
  );
}
