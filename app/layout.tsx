import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
