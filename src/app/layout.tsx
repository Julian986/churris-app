import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "shurriapp",
  description: "Una app romantica para crear y seguir contratos compartidos de a dos.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icono.png", sizes: "192x192", type: "image/png" },
      { url: "/icono.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icono.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icono.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "shurriapp",
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
