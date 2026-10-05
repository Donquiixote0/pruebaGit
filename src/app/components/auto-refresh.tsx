"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarga los datos de la página cada pocos segundos mientras se genera un capítulo. */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
