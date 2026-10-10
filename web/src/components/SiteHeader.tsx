"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { selectMealCount, usePlannerStore } from "@/store/plannerStore";

const links = [
  { href: "/recipes", label: "Recipes" },
  { href: "/planner", label: "This week" },
  { href: "/shopping-list", label: "Shopping list" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // Any component can read the store; no provider or prop drilling needed.
  // Before rehydration this is 0 on both server and client, so no mismatch.
  const mealCount = usePlannerStore(selectMealCount);
  const isDirty = usePlannerStore((s) => s.isDirty);

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        MealPlanner
      </Link>
      <nav aria-label="Main">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname.startsWith(l.href) ? "page" : undefined}
          >
            {l.label}
            {l.href === "/planner" && mealCount > 0 && (
              <span className={`count ${isDirty ? "is-dirty" : ""}`} title={isDirty ? "Unsaved changes" : undefined}>
                {mealCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
