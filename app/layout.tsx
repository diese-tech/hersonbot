import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HersonBot",
  description: "Private Civ 6 multiplayer strategy assistant MVP.",
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
