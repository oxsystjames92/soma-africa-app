import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const playfair = Playfair_Display({
  subsets:  ["latin"],
  weight:   ["400", "700", "900"],
  style:    ["normal", "italic"],
  variable: "--font-playfair",
  display:  "swap",
});

const dmSans = DM_Sans({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600", "700"],
  variable: "--font-dmsans",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "Soma Africa — Know your child. Every day.",
  description: "Grade tracking and parent notification platform for Ugandan private schools. Teachers enter grades. Parents receive WhatsApp updates instantly. No app to download.",
  metadataBase: new URL("https://soma-africa.com"),
  alternates: {
    canonical: "https://soma-africa.com",
  },
  openGraph: {
    title:       "Soma Africa — Know your child. Every day.",
    description: "Grade tracking and parent notification platform for Ugandan private schools. Teachers enter grades. Parents receive WhatsApp updates instantly.",
    url:         "https://soma-africa.com",
    siteName:    "Soma Africa",
    locale:      "en_UG",
    type:        "website",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Soma Africa — Know your child. Every day.",
    description: "Grade tracking and parent notifications over WhatsApp for Ugandan private schools. Schools earn commission on every student.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
