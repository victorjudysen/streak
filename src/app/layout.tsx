import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Newsreader } from "next/font/google";
import { sourceCodeUrl } from "@/lib/owner";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-mono-face", weight: ["400", "500"] });
const display = Newsreader({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Streak",
  description: "A private daily list with a Telegram bot and a GitHub-style streak map.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
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
