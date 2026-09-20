"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh halaman sesi tiap 10 detik agar hitungan guru live tanpa websocket. */
export default function SessionAutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(t);
  }, [enabled, router]);
  return null;
}
