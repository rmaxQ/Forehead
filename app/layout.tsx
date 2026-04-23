import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Czółko 🎭",
  description: "Gra towarzyska — zgadnij swoją postać!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-[#0f172a] text-white antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
