"use client";
import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav-root">
      <div className="wrap nav-inner">
        <Link href="/" className="nav-logo">
          SOMA<span>.</span>AFRICA
        </Link>

        <div className="desktop-nav">
          <Link href="#how" className="nav-link">How It Works</Link>
          <Link href="#features" className="nav-link">Features</Link>
          <Link
            href="#waitlist"
            className="btn btn-primary nav-cta"
            style={{ padding: "9px 18px", fontSize: 13 }}
          >
            Join Waitlist <span className="arr">→</span>
          </Link>
        </div>

        <button
          className="hamburger"
          aria-label="Open menu"
          onClick={() => setOpen(!open)}
        >
          <span />
        </button>
      </div>

      {open && (
        <div
          style={{
            background: "var(--bg-2)",
            borderTop: "1px solid var(--border-2)",
            padding: "20px var(--pad-x)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Link href="#how" className="nav-link" onClick={() => setOpen(false)} style={{ fontSize: 15 }}>
            How It Works
          </Link>
          <Link href="#features" className="nav-link" onClick={() => setOpen(false)} style={{ fontSize: 15 }}>
            Features
          </Link>
          <Link
            href="#waitlist"
            className="btn btn-primary"
            onClick={() => setOpen(false)}
            style={{ width: "fit-content" }}
          >
            Join Waitlist →
          </Link>
        </div>
      )}
    </nav>
  );
}
