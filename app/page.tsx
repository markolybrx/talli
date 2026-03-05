"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function RootPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Wait for session to resolve
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    // Session is authenticated — now check workspace
    if (status === "authenticated" && session?.user?.id && !checking) {
      setChecking(true);
      const run = async () => {
        try {
          const [wsRes] = await Promise.all([
            fetch("/api/workspace"),
            new Promise(r => setTimeout(r, 1500)), // min loading time
          ]);
          const wsData = await wsRes.json();
          if (wsData?.workspace) {
            router.replace("/dashboard");
          } else {
            router.replace("/workspace");
          }
        } catch {
          router.replace("/workspace");
        }
      };
      run();
    }
  }, [status, session, router, checking]);

  return <LoadingScreen />;
}
