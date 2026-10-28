import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovation Funding Desk",
  description:
    "An experimental TenneT tool for exploring funding opportunities, project size, timing, and source-linked call guidance.",
  icons: {
    icon: "/funding-desk-logo.png",
    shortcut: "/funding-desk-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
