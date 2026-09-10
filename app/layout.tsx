import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const brandSlogan = "One Framework, Every Assistant Experience";
const siteDescription = `${brandSlogan} Local-first assistant framework for streaming chat, voice jobs, provider routing, data connectors, and SaaS-ready scaffolds.`;
const siteUrl = process.env.TIFA_BASE_URL || "http://localhost:3100";

// ✅ Font structure
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Tifa AI",
  description: siteDescription,
  icons: {
    icon: {
      url: "/icon.png",
      type: "image/png",
      sizes: "512x512",
    },
    apple: {
      url: "/icon.png",
      type: "image/png",
      sizes: "512x512",
    },
  },
  openGraph: {
    title: "Tifa AI",
    description: siteDescription,
    type: "website",
    images: [
      {
        url: "/tifa-assistant-social.png",
        width: 1200,
        height: 630,
        alt: "Tifa AI coding robot logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tifa AI",
    description: siteDescription,
    images: ["/tifa-assistant-social.png"],
  },
};

// ✅ Root Layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
      >
        {/* Theme provider to handle dark/light */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
