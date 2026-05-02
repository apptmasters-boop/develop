import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApptMasters",
  description: "Integrated Life Management Platform for Roommates",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
