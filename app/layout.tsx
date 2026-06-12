import { ClerkProvider } from "@clerk/nextjs";
import { Lora, DM_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "bodyflow",
  description: "Private personal body and calorie tracking",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1E26",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" suppressHydrationWarning>
      <body className={`${lora.variable} ${dmSans.variable}`} suppressHydrationWarning>
        <ClerkProvider dynamic>
          <ThemeProvider defaultTheme="slate">
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
