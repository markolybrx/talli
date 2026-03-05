"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const timeout = (ms: number) => new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), ms)
        );

        // Check session with 5s timeout
        const sessionRes = await Promise.race([
          fetch("/api/auth/session"),
          timeout(5000)
        ]) as Response;
        const session = await sessionRes.json();

        if (!session?.user?.id) {
          router.replace("/login");
          return;
        }

        // Check workspace with 5s timeout
        const [wsRes] = await Promise.all([
          Promise.race([fetch("/api/workspace"), timeout(5000)]) as Promise<Response>,
          new Promise(r => setTimeout(r, 1500)),
        ]);
        const wsData = await (wsRes as Response).json();

        if (wsData?.workspace) {
          router.replace("/dashboard");
        } else {
          router.replace("/workspace");
        }
      } catch {
        router.replace("/login");
      }
    }
    check();
  }, [router]);

  return <LoadingScreen />;
}
