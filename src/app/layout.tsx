import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-5MLQXYNP5L";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "MultiBoard — Play Chess & Ludo Online With Friends (Free, No Sign-up)",
    template: "%s · MultiBoard",
  },
  description:
    "Play Chess and Ludo online with friends for free — no sign-up, no download. Enter a name, share a link, and play multiplayer board games in your browser on mobile or desktop with built-in voice, video and chat.",
  applicationName: "MultiBoard",
  keywords: [
    "play chess online with friends",
    "play ludo online with friends",
    "online board games with friends",
    "board games online with video chat",
    "play board games online free",
    "2 player chess online",
    "free online chess",
    "ludo online multiplayer",
    "ludo king alternative",
    "ludo with friends",
    "no sign up board games",
    "no download board games",
    "play board games in browser",
    "play board games over video call",
    "multiplayer board games online free",
  ],
  authors: [{ name: "MultiBoard" }],
  creator: "MultiBoard",
  category: "games",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "MultiBoard",
    title: "Play Chess & Ludo Online With Friends — Free, No Sign-up",
    description:
      "Enter a name, share a link, and play multiplayer Chess or Ludo in your browser with voice, video and chat. No account needed.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MultiBoard — Play Chess & Ludo Online With Friends",
    description:
      "Free multiplayer board games in your browser. No sign-up — just share a link and play.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
