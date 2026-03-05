"use client";

export function LoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#ffffff",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "32px", zIndex: 9999,
    }}>
      <style>{`
        @keyframes talliTyping {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="tlg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7C3AED"/>
              <stop offset="100%" stopColor="#6366F1"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#tlg)"/>
          <rect x="8" y="11" width="24" height="4" rx="2" fill="white"/>
          <rect x="8" y="18" width="18" height="4" rx="2" fill="white" opacity="0.7"/>
          <rect x="8" y="25" width="12" height="4" rx="2" fill="white" opacity="0.4"/>
          <circle cx="33" cy="27" r="4" fill="#C4B5FD"/>
          <path d="M31 27l1.5 1.5L35 25.5" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", color: "#1a1230", fontFamily: "Poppins, system-ui, sans-serif" }}>
          talli
        </span>
      </div>

      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        {[["#7C3AED", "0s"], ["#8B5CF6", "0.2s"], ["#A78BFA", "0.4s"]].map(([color, delay], i) => (
          <div key={i} style={{
            width: 9, height: 9, borderRadius: "50%", background: color,
            animation: `talliTyping 1.4s ${delay} ease-in-out infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}
