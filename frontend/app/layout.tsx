import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoria Viva | Digital Ofrenda",
  description: "A local-first archive for memories and historical timelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}