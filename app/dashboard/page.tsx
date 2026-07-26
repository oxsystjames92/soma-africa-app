"use client";
import { useEffect, useState } from "react";

type LeadRow = {
  created_at:    string;
  school_name:   string;
  director_name: string;
  role:          string;
  student_count: number;
  whatsapp:      string;
  email:         string | null;
};

const card: React.CSSProperties = {
  background: "#1A1A1A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
};

export default function Dashboard() {
  const [password, setPassword] = useState("");
  const [leads, setLeads]       = useState<LeadRow[] | null>(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function load(pw: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        sessionStorage.removeItem("soma_dash_pw");
        setLoading(false);
        return;
      }
      setLeads(data.leads);
      sessionStorage.setItem("soma_dash_pw", pw);
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("soma_dash_pw");
    if (saved) {
      setPassword(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalStudents = (leads ?? []).reduce((s, l) => s + l.student_count, 0);
  const pipeline = Math.round(totalStudents * 8000 * 0.20 * 10);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        padding: "clamp(20px, 4vw, 48px)",
        fontFamily: "var(--font-dmsans), 'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontSize: "clamp(24px, 3vw, 34px)",
            fontWeight: 700,
            color: "#F5F0E8",
            marginBottom: 4,
          }}
        >
          <span style={{ color: "#E5A019" }}>Soma</span> Leads
        </div>
        <p style={{ color: "rgba(245,240,232,0.4)", fontSize: 13, marginBottom: 32 }}>
          Private dashboard — waitlist submissions, newest first.
        </p>

        {leads === null ? (
          <form
            onSubmit={(e) => { e.preventDefault(); load(password); }}
            style={{ ...card, maxWidth: 380, padding: 28 }}
          >
            <label
              htmlFor="pw"
              style={{ display: "block", color: "rgba(245,240,232,0.7)", fontSize: 13, marginBottom: 10 }}
            >
              Dashboard password
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#0D0D0D",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#F5F0E8",
                fontSize: 15,
                marginBottom: 14,
              }}
            />
            {error && (
              <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 14 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary btn-full"
            >
              {loading ? "Loading…" : "View leads"}
            </button>
          </form>
        ) : (
          <>
            {/* Stat tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
                marginBottom: 28,
              }}
            >
              {[
                { label: "Leads",           value: leads.length.toLocaleString("en-US") },
                { label: "Students",        value: totalStudents.toLocaleString("en-US") },
                { label: "Pipeline / yr",   value: "UGX " + pipeline.toLocaleString("en-US") },
              ].map(({ label, value }) => (
                <div key={label} style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ color: "rgba(245,240,232,0.4)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: 24, fontWeight: 700, color: "#E5A019" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Lead cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leads.length === 0 && (
                <div style={{ ...card, padding: 24, color: "rgba(245,240,232,0.5)" }}>
                  No leads yet — share soma-africa.com to get the first one.
                </div>
              )}
              {leads.map((l, i) => (
                <div
                  key={i}
                  style={{
                    ...card,
                    padding: "16px 20px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "10px 24px",
                  }}
                >
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ color: "#F5F0E8", fontWeight: 600, fontSize: 15 }}>
                      {l.school_name}
                    </div>
                    <div style={{ color: "rgba(245,240,232,0.5)", fontSize: 13 }}>
                      {l.director_name} · {l.role}
                    </div>
                  </div>
                  <div style={{ color: "rgba(245,240,232,0.6)", fontSize: 13, flexShrink: 0 }}>
                    {l.student_count.toLocaleString("en-US")} students
                  </div>
                  <div style={{ color: "rgba(245,240,232,0.35)", fontSize: 12, flexShrink: 0 }}>
                    {new Date(l.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                  <a
                    href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello ${l.director_name.split(" ")[0]}, this is James from Soma Africa — thank you for joining the waitlist for ${l.school_name}!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ fontSize: 13, padding: "9px 16px", flexShrink: 0 }}
                  >
                    WhatsApp →
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
