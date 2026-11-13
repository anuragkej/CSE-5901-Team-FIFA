import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { IBM_Plex_Mono, Newsreader, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LeaseLens",
  description: "Know what you are signing before you sign it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("font-sans", sourceSans.variable, newsreader.variable, plexMono.variable)}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
