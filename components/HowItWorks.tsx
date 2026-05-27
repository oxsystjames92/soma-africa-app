"use client";
import { useEffect, useRef } from "react";

const steps = [
  {
    num: "01",
    title: "Teacher uploads grades.",
    body: "Type or paste a class's marks into the Soma sheet. Two minutes per class — done from a phone, a laptop, or a shared school computer.",
    tag: "2 min · per class",
  },
  {
    num: "02",
    title: "Soma calculates.",
    body: "Class average. Trend versus last assessment. Position in class. On-track status. A clear, plainly-written summary — no spreadsheets, no admin.",
    tag: "Instant · zero admin",
  },
  {
    num: "03",
    title: "Parent receives WhatsApp.",
    body: "A clear message from your school's name lands on the parent's phone. Read in seconds. Replied to from the school gate. No app to install.",
    tag: "WhatsApp · instant",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>(".step");
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${120 + i * 220}ms`;
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            container.classList.add("in-view");
            cards.forEach((c) => c.classList.add("in-view"));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(container);

    return () => io.disconnect();
  }, []);

  return (
    <section className="on-dark grain" id="how" data-screen-label="03 How it works">
      <div className="section-rule" aria-hidden="true" />
      <span className="section-ordinal" aria-hidden="true">02</span>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 80px" }}>
          <span className="eyebrow">02 — How Soma works</span>
          <h2
            className="display h-xl"
            style={{ margin: "22px 0 18px", color: "var(--white)" }}
          >
            Three steps. <em>Sixty seconds.</em>
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            For teachers: one simple sheet. For parents: a WhatsApp from your
            school&apos;s name. Soma sits between the gradebook and the
            conversation.
          </p>
        </div>

        <div className="steps" ref={containerRef} id="stepsContainer">
          {steps.map(({ num, title, body, tag }) => (
            <article key={num} className="step">
              <div
                style={{
                  width: 76, height: 76, borderRadius: "50%",
                  background: "var(--mustard)", color: "var(--dark)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700, fontSize: 30,
                  margin: "0 auto 26px",
                  border: "6px solid var(--dark)",
                  boxShadow: "0 0 0 1.5px var(--mustard), 0 0 30px rgba(229,160,25,0.32)",
                  position: "relative", zIndex: 3,
                }}
              >
                {num}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 700,
                  fontSize: 26, lineHeight: 1.1, margin: "0 0 12px",
                  textAlign: "center", color: "var(--white)",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: 0, color: "rgba(255,255,255,0.66)", fontSize: 14.5,
                  textAlign: "center", lineHeight: 1.55,
                }}
              >
                {body}
              </p>
              <span
                style={{
                  display: "block", margin: "18px auto 0", width: "max-content",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--mustard)", padding: "6px 12px",
                  background: "rgba(229,160,25,0.12)", border: "1px solid rgba(229,160,25,0.30)",
                  borderRadius: 999,
                }}
              >
                {tag}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
