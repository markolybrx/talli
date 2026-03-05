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
        // Check session
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (!session?.user?.id) {
          router.replace("/login");
          return;
        }

        // Check workspace
        const wsRes = await fetch("/api/workspace");
        const wsData = await wsRes.json();

        // Show loading for at least 2.5s for animation
        await new Promise(r => setTimeout(r, 2500));

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
