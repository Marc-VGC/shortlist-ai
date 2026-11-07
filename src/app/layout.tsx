import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ShortlistAI – fair, evidence-based resume screening",
  description: "AI resume screening for HR teams: ranked shortlist, quoted evidence per requirement, interview questions, and automatic removal of personal details.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        {/* Basic monitoring: page views & visitors in the Vercel dashboard */}
        <Analytics />
      </body>
    </html>
  );
}
