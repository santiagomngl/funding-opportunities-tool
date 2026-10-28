import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovation Funding Desk",
  description:
    "An experimental TenneT tool for exploring funding opportunities, project size, timing, and source-linked call guidance.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
