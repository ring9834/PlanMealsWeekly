"use client";

import dynamic from "next/dynamic";

/**
 * Pure CSR. `ssr: false` means the server sends only the loading state and the
 * planner renders entirely in the browser. That suits this page: it's private,
 * needs no SEO, and depends on localStorage. (`ssr: false` is only allowed
 * inside a client component, which is why this wrapper exists.)
 */
// dynamic import is a Next.js feature that lets us load a component lazily, so it’s not included in the initial HTML.
// It wraps a component so that it’s loaded lazily: its JavaScript is split into a separate file (a “chunk”) that the browser fetches only when the component is actually rendered
// Instead of loading the component's code when the page first loads, Next.js waits.
// Normally, a build tool bundles all your JS into big files. With dynamic(), the wrapped component's code gets pulled out into its own small file — called a "chunk." The chunk sits on the server, unused, until needed.
// import() with parentheses is a dynamic import, a standard JavaScript feature. Unlike import { Planner } from "./Planner" at the top of a file, it doesn’t load the module straight away. It returns a promise that resolves when the module has been fetched.
// But Planner.tsx doesn't have a default export — it has a named export called Planner.
// .then((m) => m.Planner) intercepts the promise after the module loads and picks out the named export before handing it to dynamic.
// if Planner is declared like 'export default function Planner() { ... }', then you can just write dynamic(() => import("./Planner"), { ssr: false, loading: () => <p className="muted">Loading your plan…</p> }) without the .then() part.
const Planner = dynamic(() => import("./Planner").then((m) => m.Planner), {
    ssr: false,
    loading: () => <p className="muted">Loading your plan…</p>,
});

export function PlannerLoader() {
    return <Planner />;
}

// What happens when we open /planner:
// The server sends HTML with the header and “Loading your plan…”.
// The browser shows it immediately and starts running React.
// React reaches the dynamic component and starts downloading the planner chunk.
// When the chunk arrives, Planner replaces the loading text and renders for the first time, in the browser.
// Planner reads our draft from Zustand (restored from localStorage) and fetches recipes and the saved plan with TanStack Query.
