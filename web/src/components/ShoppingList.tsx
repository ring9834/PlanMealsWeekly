"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { formatQuantity } from "@/lib/format";
import { shoppingListQuery } from "@/lib/queries";
import { toEntries, usePlannerHydrated, usePlannerStore } from "@/store/plannerStore";
import { useShoppingStore } from "@/store/shoppingStore";

export function ShoppingList() {
    const hydrated = usePlannerHydrated();
    const days = usePlannerStore((s) => s.days);

    // The request body doubles as the query key: change a serving count and the
    // key changes, so TanStack Query fetches a fresh list (and caches each version).
    const entries = useMemo(
        () => toEntries(days).map(({ recipeId, servings }) => ({ recipeId, servings })),
        [days],
    );

    const list = useQuery({
        ...shoppingListQuery(entries),
        enabled: hydrated && entries.length > 0,
        placeholderData: keepPreviousData,
    });

    const checked = useShoppingStore((s) => s.checked);
    const toggle = useShoppingStore((s) => s.toggle);
    const clearChecked = useShoppingStore((s) => s.clearChecked);

    const remaining = list.data?.filter((i) => !checked[i.ingredientId]).length ?? 0;

    if (!hydrated) return <p className="muted">Loading…</p>;

    if (entries.length === 0) {
        return (
            <section className="empty">
                <h1>Shopping list</h1>
                <p>Your list is built from this week&apos;s plan, and the plan is empty.</p>
                <Link className="btn btn-primary" href="/recipes">
                    Pick some recipes
                </Link>
            </section>
        );
    }

    return (
        <section className="shopping">
            <header className="section-head">
                <div>
                    <h1>Shopping list</h1>
                    <p className="muted">
                        {list.data ? `${remaining} of ${list.data.length} left to buy` : "Adding it up…"}
                    </p>
                </div>
                <button className="btn" onClick={clearChecked}>
                    Untick everything
                </button>
            </header>

            {list.isError && (
                <p className="notice notice-error">
                    Couldn&apos;t build the list.{" "}
                    <button className="link" onClick={() => list.refetch()}>
                        Try again
                    </button>
                </p>
            )}

            <ul className={`checklist ${list.isPlaceholderData ? "is-stale" : ""}`}>
                {list.data?.map((item) => (
                    <li key={item.ingredientId}>
                        <label className={checked[item.ingredientId] ? "is-checked" : ""}>
                            <input
                                type="checkbox"
                                checked={!!checked[item.ingredientId]}
                                onChange={() => toggle(item.ingredientId)}
                            />
                            <span className="qty">
                                {formatQuantity(item.quantity)} {item.unit}
                            </span>
                            <span>{item.name}</span>
                        </label>
                    </li>
                ))}
            </ul>
        </section>
    );
}
