import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Wordmark } from "@/components/wordmark";
import Link from "next/link";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FieldScribe",
  description: "Local transcription with speaker separation — who said what, on your own machine.",
};

export const viewport: Viewport = {
  themeColor: "#0c0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${bricolage.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-8">
            <Link href="/">
              <Wordmark />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              on this Mac
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
