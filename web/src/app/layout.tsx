import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MealPlanner", template: "%s · MealPlanner" },
  description: "Plan a week of meals and get one shopping list for all of it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime (not next/font) so `docker build` needs no font download. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Figtree:wght@400;600&display=swap"
        />
      </head>
      <body>
        <Providers>
          <SiteHeader />
          <main className="page">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
