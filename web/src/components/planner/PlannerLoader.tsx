"use client";

import dynamic from "next/dynamic";

/**
 * Pure CSR. `ssr: false` means the server sends only the loading state and the
 * planner renders entirely in the browser. That suits this page: it's private,
 * needs no SEO, and depends on localStorage. (`ssr: false` is only allowed
 * inside a client component, which is why this wrapper exists.)
 */
const Planner = dynamic(() => import("./Planner").then((m) => m.Planner), {
  ssr: false,
  loading: () => <p className="muted">Loading your plan…</p>,
});

export function PlannerLoader() {
  return <Planner />;
}
