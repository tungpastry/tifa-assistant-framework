import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const brandSlogan = "Hey trader, how are you feeling today?";
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
  title: "Tifa Assistant Framework",
  description: siteDescription,
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Tifa Assistant Framework",
    description: siteDescription,
    type: "website",
    images: [
      {
        url: "/tifa-assistant-logo.png",
        width: 1254,
        height: 1254,
        alt: "Tifa Assistant Framework logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tifa Assistant Framework",
    description: siteDescription,
    images: ["/tifa-assistant-logo.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300 bg-background text-foreground`}
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
