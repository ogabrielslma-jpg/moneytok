"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-600">
        Redirecionando...
      </p>
    </div>
  );
}
