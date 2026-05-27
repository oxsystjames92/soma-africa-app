export function SomaMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="soma-mark"
      style={{ "--tile-size": `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 6 L52 44 L8 44 Z" />
        <path d="M14 26 L22 44 L6 44 Z" fillOpacity="0.74" />
        <path d="M46 18 L54 44 L38 44 Z" fillOpacity="0.88" />
      </svg>
    </span>
  );
}

export function SomaLockup({ markSize = 40 }: { markSize?: number }) {
  return (
    <a
      href="#"
      className="soma-lockup"
      aria-label="Soma — Know your child. Everyday."
    >
      <SomaMark size={markSize} />
      <span className="wm">
        SOMA<span className="bar" />
      </span>
    </a>
  );
}
