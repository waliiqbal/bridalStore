import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { getSettings } from "@/modules/shop/api/shop.api";
import { jsonLdString } from "@/modules/shop/lib/seo";
import { TrackingScripts } from "@/modules/tracking/components/TrackingScripts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// The store name comes from Settings in the admin, so renaming the store there renames every page.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const name = settings?.storeName ?? brand.name;
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: `${name} | Pakistani bridal & festive wear`, template: `%s | ${name}` },
    description: brand.tagline,
    openGraph: { siteName: name, type: "website" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings().catch(() => null);

  // Tells Google who we are (the "Organization" the brief asks for)
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings?.storeName ?? brand.name,
    url: env.siteUrl,
    logo: `${env.siteUrl}/brand/malikah-logo-navy.png`,
    email: settings?.contactEmail ?? undefined,
    telephone: settings?.contactPhone ?? undefined,
    sameAs: [settings?.instagramUrl, settings?.facebookUrl, settings?.tiktokUrl].filter(Boolean),
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to body before React loads */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organization) }} />
        {children}
        <TrackingScripts
          metaPixelId={settings?.metaPixelId ?? null}
          googleAnalyticsId={settings?.googleAnalyticsId ?? null}
        />
      </body>
    </html>
  );
}
