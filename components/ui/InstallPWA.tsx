"use client";

import { useEffect, useState } from "react";

export function InstallPWA() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (installed || dismissed || !prompt) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, width: "calc(100% - 48px)", maxWidth: 380,
      background: "white", borderRadius: 16, padding: "16px 20px",
      boxShadow: "0 8px 32px rgba(124,58,237,0.15), 0 2px 8px rgba(0,0,0,0.08)",
      border: "1px solid #ede9fe",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      {/* Icon */}
      <div style={{ flexShrink: 0 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="pi" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7C3AED"/>
              <stop offset="100%" stopColor="#6366F1"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#pi)"/>
          <rect x="8" y="11" width="24" height="4" rx="2" fill="white"/>
          <rect x="8" y="18" width="18" height="4" rx="2" fill="white" opacity="0.7"/>
          <rect x="8" y="25" width="12" height="4" rx="2" fill="white" opacity="0.4"/>
          <circle cx="33" cy="27" r="4" fill="#C4B5FD"/>
          <path d="M31 27l1.5 1.5L35 25.5" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1230", margin: 0, fontFamily: "Poppins, system-ui, sans-serif" }}>
          Install Talli
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", fontFamily: "Poppins, system-ui, sans-serif" }}>
          Add to home screen for quick access
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
            background: "white", fontSize: 12, color: "#9ca3af", cursor: "pointer",
            fontFamily: "Poppins, system-ui, sans-serif",
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #7C3AED, #6366F1)",
            fontSize: 12, color: "white", cursor: "pointer", fontWeight: 600,
            fontFamily: "Poppins, system-ui, sans-serif",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
