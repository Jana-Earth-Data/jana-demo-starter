import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jana Demo Starter",
  description: "Demo experience powered by Jana Earth Data",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
