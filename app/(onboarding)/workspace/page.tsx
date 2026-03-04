"use client";

import dynamic from "next/dynamic";

const WorkspacePage = dynamic(() => import("@/components/onboarding/WorkspacePageClient"), { ssr: false });

export default function Page() {
  return <WorkspacePage />;
}
