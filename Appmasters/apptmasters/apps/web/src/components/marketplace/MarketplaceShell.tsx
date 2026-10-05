import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { SiteHeader, type Viewer } from "./SiteHeader";
import { MobileBottomNav } from "./MobileBottomNav";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export function MarketplaceShell({ viewer, active, children }: {
  viewer: Viewer; active: string; children: ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-white pb-16 text-gray-900 md:pb-0`}>
      <SiteHeader viewer={viewer} active={active} />
      {children}
      <MobileBottomNav active={active} />
    </div>
  );
}
