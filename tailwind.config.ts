import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mustard: {
          DEFAULT: "#E5A019",
          deep: "#B97F0E",
          bright: "#F2B22A",
          tint: "#FBF1D8",
        },
        dark: {
          DEFAULT: "#073828",
          2: "#052D21",
          3: "#03211A",
        },
        parchment: {
          DEFAULT: "#FAF3E0",
          2: "#F1E8CE",
          edge: "#E5D9B8",
        },
        ink: {
          DEFAULT: "#1A1410",
          soft: "#4A3F36",
        },
        muted: "#6F6452",
        soma: {
          success: "#CBDC4A",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        archivo: ["var(--font-archivo)", "sans-serif"],
      },
      maxWidth: {
        content: "1280px",
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "22px",
        xl: "32px",
      },
      animation: {
        pulse: "pulse-dot 2.2s infinite",
        float: "float-stage 8s ease-in-out infinite",
        "pulse-border": "pulse-border 2.4s infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%": { boxShadow: "0 0 0 0 rgba(229,160,25,0.55)" },
          "70%": { boxShadow: "0 0 0 16px rgba(229,160,25,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(229,160,25,0)" },
        },
        "float-stage": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-border": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(229,160,25,0.6)",
            borderColor: "#E5A019",
          },
          "50%": {
            boxShadow: "0 0 0 8px rgba(229,160,25,0)",
            borderColor: "#F2B22A",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
