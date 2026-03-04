import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Talli — Workspace Task Manager",
  description: "AI-powered task management for your team.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Talli" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#6366F1" />
      </head>
      <body className="font-poppins bg-background text-text-primary antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: "Poppins, sans-serif", fontSize: "14px", borderRadius: "12px", border: "1px solid #E4E4E7" },
          success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#F43F5E", secondary: "#fff" } },
        }} />
      </body>
    </html>
  );
}
