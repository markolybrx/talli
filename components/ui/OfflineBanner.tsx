"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [showReturned, setShowReturned] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      setShowReturned(true);
      setTimeout(() => setShowReturned(false), 3000);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline && !showReturned) return null;

  return (
    <div className={`fixed top-16 left-0 right-0 z-50 flex items-center justify-center px-4 py-2 text-xs font-medium transition-all duration-300 ${
      offline ? "bg-danger text-white" : "bg-success text-white"
    }`}>
      {offline ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          You are offline — changes won't save
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Back online
        </>
      )}
    </div>
  );
}
