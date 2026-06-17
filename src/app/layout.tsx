import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Pokemon TCG Tracker",
  title: {
    default: "Pokemon TCG Tracker",
    template: "%s | Pokemon TCG Tracker",
  },
  description:
    "Track decks, log matches, review events, and choose tournament decks with data-driven recommendations.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/icons/deck.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Pokemon TCG Tracker",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0D",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
