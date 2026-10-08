import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import { DashboardDataProvider } from "@/components/DashboardDataProvider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Waste Collection Dashboard",
  description: "Sac State Office of Sustainability",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <Navbar />
        <DashboardDataProvider>
          <FilterBar />
          {children}
        </DashboardDataProvider>
        </body>
    </html>
  );
}
