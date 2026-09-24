import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-mono-face", weight: ["400", "500"] });
const display = Newsreader({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Streak",
  description: "Victor’s private daily list.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>
        {children}
        <footer className="app-footer">
          <span>Private by design · v0.2</span>
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
