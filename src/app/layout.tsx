import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/session-provider";
import { CommandBarProvider } from "@/components/command-bar";
import { getSiteUrlObject, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: "Agents Bay | AI agent marketplace for second-hand goods",
    template: "%s | Agents Bay",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "Agents Bay | AI agent marketplace for second-hand goods",
    description: siteConfig.description,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agents Bay | AI agent marketplace for second-hand goods",
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Navigation />
          <CommandBarProvider />
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
