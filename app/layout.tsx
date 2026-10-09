import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Fredoka } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit", // keep same variable name so all JSX still works
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });
// Font display bergaya game anak (untuk teks ukiran kayu di navbar) — rounded, bobot bisa diatur
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka" });

import NextTopLoader from 'nextjs-toploader';
import QueryProvider from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: "MicroJourney AR",
  description: "Petualangan Sains Mikroplastik — IPA Kelas VIII Kurikulum Merdeka",
  icons: {
    icon: "/logo/no-bg.webp"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${fredoka.variable} h-full`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f9fb] text-[#191c1e]">
        <NextTopLoader color="#ba1a1a" showSpinner={false} />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
