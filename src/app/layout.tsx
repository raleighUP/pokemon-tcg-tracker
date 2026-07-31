import type { Metadata, Viewport } from "next";
import ThemeController from "@/components/ThemeController";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Top Cut",
  title: {
    default: "Top Cut",
    template: "%s | Top Cut",
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
        url: "/icons/top-cut-app-icon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/top-cut-app-icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
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
    title: "Top Cut",
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
      <body className="min-h-full flex flex-col">
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
