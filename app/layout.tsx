import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soma Africa — The end-of-term reporting system that runs itself",
  description:
    "Soma sends every parent a personal WhatsApp message after every exam — automatically. Built for Uganda's private schools.",
  metadataBase: new URL("https://soma-africa.com"),
  openGraph: {
    title: "Soma Africa — The end-of-term reporting system that runs itself",
    description:
      "No app to download. No login to create. Every parent hears from your school after every term.",
    siteName: "Soma Africa",
    locale: "en_UG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
