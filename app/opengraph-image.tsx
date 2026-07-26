import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Soma Africa — Know your child. Every day.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0D0D0D",
          position: "relative",
        }}
      >
        {/* Mustard top border */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: "#E5A019",
          }}
        />
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#E5A019",
            letterSpacing: "0.25em",
            marginBottom: 32,
          }}
        >
          SOMA AFRICA
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "#F5F0E8",
            lineHeight: 1.1,
            marginBottom: 36,
            maxWidth: 900,
          }}
        >
          Know your child. Every day.
        </div>
        <div
          style={{
            fontSize: 30,
            color: "rgba(245,240,232,0.65)",
            lineHeight: 1.5,
            maxWidth: 850,
            marginBottom: 48,
          }}
        >
          Grades to parents over WhatsApp — no app to download. Schools earn
          commission on every student.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              background: "#E5A019",
              color: "#0D0D0D",
              fontSize: 26,
              fontWeight: 700,
              padding: "18px 36px",
              borderRadius: 10,
            }}
          >
            Join the founding schools →
          </div>
          <div style={{ fontSize: 26, color: "rgba(245,240,232,0.45)" }}>
            soma-africa.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
