import type { Metadata } from "next";

import "@/app/globals.css";

const siteTitle = "Jeoprompty! Multiplayer AI Prompt-Jeopardy Party Game";
const siteDescription =
  "Host a live AI prompt-writing trivia party where players race to craft Jeopardy-style questions and climb the leaderboard in real time.";

function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  try {
    return new URL(envUrl ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteTitle,
    template: "%s | Jeoprompty!"
  },
  description: siteDescription,
  applicationName: "Jeoprompty!",
  keywords: [
    "Jeopardy party game",
    "AI party game",
    "prompt game",
    "multiplayer trivia",
    "party trivia",
    "Jeoprompty"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Jeoprompty!",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Jeoprompty game board preview with Play Jeoprompty button"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  category: "games",
  referrer: "origin-when-cross-origin"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
