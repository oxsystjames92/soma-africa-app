import type { Metadata } from "next";
import { Playfair_Display, Manrope, Archivo_Black } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soma — Know your child. Everyday.",
  description:
    "After every grade, every parent hears from your school — on WhatsApp. Automatically. In plain words. Soma keeps families informed everyday.",
  metadataBase: new URL("https://soma-africa.com"),
  openGraph: {
    title: "Soma — Know your child. Everyday.",
    description:
      "Soma keeps every parent updated automatically — after every grade, every assessment, every term. No app. No login. Just a WhatsApp message.",
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
      className={`${playfair.variable} ${manrope.variable} ${archivoBlack.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
