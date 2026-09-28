import type { Metadata } from "next";
import localFont from "next/font/local";
import { sourceCodeUrl } from "@/lib/owner";
import "./globals.css";

// Fonts ship with the app (src/app/fonts, SIL Open Font License) instead of being
// downloaded from Google Fonts at build time, so a Google outage can't fail a build.
const dmSans = localFont({
  src: [{ path: "./fonts/dm-sans-latin-wght-normal.woff2", weight: "100 1000", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
});
const dmMono = localFont({
  src: [
    { path: "./fonts/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono-face",
  display: "swap",
});
const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/newsreader-latin-wght-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "Streak",
  description: "A private daily list with a Telegram bot and a GitHub-style streak map.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${newsreader.variable}`}>
      <body>
        {children}
        <footer className="app-footer">
          <span>
            <span className="footer-tagline">Private by design · </span>
            <a href={sourceCodeUrl()}>Source code</a> (AGPL-3.0)
          </span>
          <span>
            Designed by{" "}
            <a href="https://thisuncle.co.tz">
              <strong>ThisUncle Technologies</strong>
            </a>
          </span>
        </footer>
      </body>
    </html>
  );
}
