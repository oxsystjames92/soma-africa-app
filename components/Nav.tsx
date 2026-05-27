"use client";
import { useEffect, useState } from "react";
import { SomaMark } from "./SomaLogo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header
        className="nav-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          background: scrolled
            ? "rgba(13,13,13,0.95)"
            : "rgba(13,13,13,0.78)",
          backdropFilter: "saturate(160%) blur(14px)",
          WebkitBackdropFilter: "saturate(160%) blur(14px)",
          color: "var(--white)",
          transition: "box-shadow 220ms var(--ease), background-color 220ms",
          boxShadow: scrolled
            ? "0 1px 0 rgba(229,160,25,0.18), 0 8px 30px rgba(0,0,0,0.32)"
            : "none",
        }}
      >
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 76 }}>
          <a href="#" className="soma-lockup" aria-label="Soma — Know your child. Everyday.">
            <SomaMark size={40} />
            <span className="wm">SOMA<span className="bar" /></span>
          </a>

          <nav
            aria-label="Primary"
            style={{
              display: "flex",
              gap: 36,
              fontSize: 14.5,
              fontWeight: 500,
              color: "rgba(255,255,255,0.78)",
            }}
            className="desktop-nav"
          >
            {[
              { label: "How It Works", href: "#how" },
              { label: "For Schools", href: "#schools" },
              { label: "Pricing", href: "#pricing" },
              { label: "Contact", href: "#contact" },
            ].map(({ label, href }) => (
              <a key={href} href={href} className="nav-link">
                {label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="#waitlist" className="btn small nav-cta">
              Join Waitlist
            </a>
            <button
              className="hamburger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className="mobile-menu"
        aria-hidden={!menuOpen}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--dark)",
          zIndex: 100,
          padding: "32px clamp(20px,4vw,64px) 40px",
          display: "flex",
          flexDirection: "column",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 220ms var(--ease)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 50 }}>
          <a href="#" className="soma-lockup" onClick={close}>
            <SomaMark size={40} />
            <span className="wm">SOMA<span className="bar" /></span>
          </a>
          <button
            onClick={close}
            aria-label="Close menu"
            style={{
              width: 44, height: 44,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent", color: "var(--white)",
              borderRadius: 10, fontSize: 22, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "How It Works", href: "#how" },
            { label: "For Schools", href: "#schools" },
            { label: "Pricing", href: "#pricing" },
            { label: "Contact", href: "#contact" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={close}
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontSize: 36,
                color: "var(--white)",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <a href="#waitlist" className="btn large" onClick={close} style={{ marginTop: 30, width: "fit-content" }}>
          Join Waitlist <span className="arr">→</span>
        </a>
      </div>

    </>
  );
}
