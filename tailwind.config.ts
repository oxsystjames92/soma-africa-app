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
          hover:   "#F2B22A",
          deep:    "#B97F0E",
          tint:    "#FBF1D8",
        },
        dark: {
          DEFAULT: "#0D0D0D",
          card:    "#1A1A1A",
          surface: "#141414",
        },
        parchment: {
          DEFAULT: "#FAF3E0",
          card:    "#FFFFFF",
          deep:    "#F0E6CA",
        },
        soma: {
          green: "#22C55E",
          blue:  "#3B82F6",
        },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        body:    ["var(--font-dmsans)",   "DM Sans",          "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1280px",
      },
      animation: {
        float:          "float 3s ease-in-out infinite",
        "pulse-border": "pulseBorder 2.4s ease-in-out infinite",
        "fade-up":      "fadeUp 0.6s ease both",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        pulseBorder: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(229,160,25,0.55)" },
          "50%":      { boxShadow: "0 0 0 10px rgba(229,160,25,0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
