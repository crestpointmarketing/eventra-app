import type { Metadata } from "next";
import { Inter } from "next/font/google";

export const dynamic = 'force-dynamic'
import "./globals.css";
import { Providers } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Eventra - AI-Enabled Event-to-Revenue OS",
  description: "Event management and lead tracking platform",
  icons: {
    icon: [
      { url: "/favicon.png?v=brain-only-2", type: "image/png" },
      { url: "/icon.png?v=brain-only-2", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.png?v=brain-only-2",
    apple: "/apple-icon.png?v=brain-only-2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
