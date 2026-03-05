import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/providers/Providers";
import { InstallPWA } from "@/components/ui/InstallPWA";
import { PWASetup } from "@/components/ui/PWASetup";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Talli — Workspace Task Manager",
  description: "AI-powered task management for your team.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-poppins antialiased" style={{ backgroundColor: "#FAFAFA", color: "#18181B" }}>
        <Providers>
          {children}
        </Providers>
        <PWASetup />
        <InstallPWA />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
