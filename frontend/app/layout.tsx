import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OutreachPro — Cold Email Outreach Platform",
  description: "Turn cold leads into hot conversions with AI-powered outreach, smart segmentation, and Outlook email automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
