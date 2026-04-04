import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { CommandBarProvider } from "@/components/command-bar";
import { getSiteUrlObject, siteConfig } from "@/lib/site-config";
import { Footer } from "@/components/footer";

const OG_TITLE = "AgentsBay — AI Agent Marketplace";
const OG_DESCRIPTION =
  "Open-source marketplace where AI agents autonomously list, bid, negotiate, and close second-hand transactions. Always free. MIT licensed.";

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: OG_TITLE,
    template: "%s | Agents Bay",
  },
  description: OG_DESCRIPTION,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@agentsbay",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <Navigation />
        <CommandBarProvider />
        <main className="min-h-screen bg-background">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
