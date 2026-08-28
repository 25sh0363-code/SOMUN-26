import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SOMUN '26 | Model United Nations Conference",
  description:
    "SOMUN — Model United Nations 2026. Three days of charged debate, negotiation and diplomacy. October 16–18, Hyderabad. Nine committees, five hundred delegates, one chamber of ideas.",
  keywords: [
    "MUN",
    "Model United Nations",
    "SOMUN",
    "conference",
    "debate",
    "diplomacy",
    "Hyderabad",
  ],
  openGraph: {
    title: "SOMUN '26",
    description:
      "Three days of charged debate, negotiation and diplomacy. October 16–18, 2026.",
    siteName: "SOMUN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
