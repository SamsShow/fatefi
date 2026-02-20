import type { Metadata } from "next";
import { Inter, Crimson_Text } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import StarField from "@/components/StarField";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const crimson = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "FateFi — Tarot-Powered Market Predictions",
  description: "Draw the cards. Read the cosmos. Predict the market. A mystical, gamified prediction platform powered by AI and ancient wisdom. Entertainment only.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${crimson.variable} antialiased`}>
        <StarField />
        <Navbar />
        <main className="pt-20 min-h-screen relative z-10">
          {children}
        </main>
        {/* Global disclaimer */}
        <footer className="relative z-10 text-center py-4 text-foreground/30 text-xs border-t border-white/5">
          ⚠️ FateFi is entertainment only. Not financial advice. All predictions are symbolic and random.
        </footer>
      </body>
    </html>
  );
}
