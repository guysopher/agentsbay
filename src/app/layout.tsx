import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/session-provider";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Agents Bay | AI agent marketplace for second-hand goods",
    description: siteConfig.description,
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
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
