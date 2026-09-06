import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import OceanWaves from "@/components/OceanWaves";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-sans",
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Dashboard | Tidal Agent",
  description: "Tidal Agent platform dashboard, activity timeline logs, development roadmap, system telemetry, and agent reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased font-sans bg-bg text-text-primary relative min-h-screen flex flex-col`}
      >
        {/* Global Definitions for SVG gradients & filters */}
        <svg style={{ display: "none" }}>
          <defs>
            <linearGradient id="traceGradLayout" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--teal)" />
              <stop offset="50%" stopColor="var(--purple)" />
              <stop offset="100%" stopColor="var(--amber)" />
            </linearGradient>
            <linearGradient id="tidalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ff8a3d" />
              <stop offset="100%" stopColor="#f6ad55" />
            </linearGradient>
            <linearGradient id="riverGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3182ce" />
              <stop offset="100%" stopColor="#4fd1c5" />
            </linearGradient>
            <linearGradient id="creekGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#9f7aea" />
              <stop offset="100%" stopColor="#ed64a6" />
            </linearGradient>
            <linearGradient id="streamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#319795" />
              <stop offset="100%" stopColor="#48bb78" />
            </linearGradient>
            <linearGradient id="lightningGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#d69e2e" />
              <stop offset="100%" stopColor="#ecc94b" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79,209,197,0.15)" />
              <stop offset="100%" stopColor="rgba(255,138,61,0.02)" />
            </linearGradient>
            <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>

        <div className="bg-grid"></div>
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>

        <Header />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Tidal Agent",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Linux",
              "description": "Autonomous AI agent platform focusing on secure, unattended operations and infrastructure audits.",
              "author": {
                "@type": "Organization",
                "name": "Hurricane AI Technologies LLC"
              }
            })
          }}
        />

        <main className="max-w-[1120px] mx-auto px-8 w-full flex-1 pt-10 pb-[160px] relative z-10">
          <article>
            {children}
          </article>
        </main>

        <footer className="bg-[#02060d]/90 border-t border-[#e8eaed]/8 py-10 relative z-10">
          <div className="max-w-[1120px] mx-auto px-8 w-full flex flex-col md:flex-row justify-between items-center gap-5 text-text-faint text-[0.85rem]">
            <div>© 2026 Tidal Agent Project. Built with React/Next.js.</div>
            <div className="flex gap-7">
              <a href="https://github.com/tidalwave-org" className="text-text-dim hover:text-amber-accent transition-colors">GitHub</a>
              <a href="/feed.atom" className="text-text-dim hover:text-amber-accent transition-colors">Atom Feed</a>
              <a href="/sitemap.xml" className="text-text-dim hover:text-amber-accent transition-colors">Sitemap</a>
            </div>
          </div>
        </footer>

        <OceanWaves />
      </body>
    </html>
  );
}
