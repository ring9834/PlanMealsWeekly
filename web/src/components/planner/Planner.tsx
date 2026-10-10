"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { currentPlanQuery, mealPlanKeys, recipesQuery } from "@/lib/queries";
import { DAYS, type MealPlan, type MealPlanEntry, type RecipeSummary } from "@/lib/types";
import {
    selectMealCount,
    toEntries,
    usePlannerHydrated,
    usePlannerStore,
} from "@/store/plannerStore";
import { DayRow } from "./DayRow";

export function Planner() {
    const queryClient = useQueryClient();
    const hydrated = usePlannerHydrated();

    // ---- server state (TanStack Query) ----
    const serverPlan = useQuery(currentPlanQuery());
    const recipes = useQuery(recipesQuery({ pageSize: 100 }));
    const recipesById = useMemo(
        () => new Map<number, RecipeSummary>(recipes.data?.items.map((r) => [r.id, r])),
        [recipes.data],
    );

    // ---- client state (Zustand) ----
    const days = usePlannerStore((s) => s.days);
    const isDirty = usePlannerStore((s) => s.isDirty);
    const lastSyncedAt = usePlannerStore((s) => s.lastSyncedAt);
    const mealCount = usePlannerStore(selectMealCount);
    const loadFromServer = usePlannerStore((s) => s.loadFromServer);
    const markSaved = usePlannerStore((s) => s.markSaved);
    const clearWeek = usePlannerStore((s) => s.clearWeek);

    // Derived data: compute with useMemo. A selector like `s => toEntries(s.days)`
    // returns a new array every time and makes Zustand v5 re-render forever.
    const entries = useMemo(() => toEntries(days), [days]);

    // Sync rule: with no unsaved edits, the server copy wins. With unsaved
    // edits, keep the local draft and let the user decide.
    useEffect(() => {
        if (!hydrated || !serverPlan.data || isDirty) return;
        if (serverPlan.data.updatedAt !== lastSyncedAt) loadFromServer(serverPlan.data);
    }, [hydrated, serverPlan.data, isDirty, lastSyncedAt, loadFromServer]);

    // ---- the moment client state becomes server state ----
    // TanStack Query then runs the callbacks in this order: onMutate -> mutationFn (the HTTP request) -> onSuccess or onError
    const save = useMutation({
        mutationFn: ({ entries }: { entries: MealPlanEntry[]; revision: number }) =>
            api.saveCurrentPlan(entries),
        onMutate: async ({ entries }) => {
            // Optimistic update: write the new plan into the cache before the API answers. This runs before the request is sent.
            // TanStack Query refetches automatically, for example when you switch back to the browser tab. If a refetch of the saved plan were in flight, it could finish after this point and overwrite the optimistic data with the old plan. Cancelling it prevents that race.
            await queryClient.cancelQueries({ queryKey: mealPlanKeys.current });
            // This takes a snapshot of what the cache holds now, so it can be restored if the save fails.
            const previous = queryClient.getQueryData<MealPlan>(mealPlanKeys.current);
            // This writes the new plan into the cache as if the server had already accepted it. That’s what “optimistic” means: assume success, and correct course if it fails.
            queryClient.setQueryData<MealPlan>(mealPlanKeys.current, {
                entries,
                updatedAt: previous?.updatedAt ?? null, // updatedAt keeps the old value because the real timestamp is only known once the server replies.
            });
            return { previous }; // Whatever onMutate returns is handed to onError as its third argument. This is how the snapshot reaches the rollback code.
        },
        onError: (_error, _vars, context) => {
            // Roll back the cache. The Zustand draft is untouched, so nothing is lost.
            if (context?.previous) queryClient.setQueryData(mealPlanKeys.current, context.previous);
            // Our work is safe because the draft lives in Zustand, not in this cache.
            // A failed save doesn’t touch the store, so isDirty stays true. The Save button stays enabled, and the page shows “The plan wasn’t saved… you can save again.”
            // The underscores in _error and _vars are a naming convention meaning “received but not used here”.
        },
        onSuccess: (saved, { revision }) => { // saved is the API’s response, which is the plan as actually stored.
            queryClient.setQueryData(mealPlanKeys.current, saved); // It replaces the optimistic guess for two reasons: it has the real updatedAt, and the server may have adjusted things (it clamps servings to 1–50, for example).
            markSaved(saved.updatedAt, revision);
        },
    });

    if (!hydrated) return <p className="muted">Loading your plan…</p>;

    return (
        <section className="planner">
            <header className="section-head planner-head">
                <div>
                    <h1>This week</h1>
                    <p className="muted">
                        {mealCount} {mealCount === 1 ? "meal" : "meals"} planned
                        {isDirty && <span className="unsaved"> · unsaved changes</span>}
                    </p>
                </div>
                <div className="planner-actions">
                    {isDirty && serverPlan.data && (
                        <button className="btn" onClick={() => loadFromServer(serverPlan.data)}>
                            Discard changes
                        </button>
                    )}
                    <button className="btn" onClick={clearWeek} disabled={mealCount === 0}>
                        Clear week
                    </button>
                    <button
                        className="btn btn-primary"
                        disabled={!isDirty || save.isPending}
                        onClick={() =>
                            save.mutate({ entries, revision: usePlannerStore.getState().revision })
                        }
                    >
                        {save.isPending ? "Saving…" : "Save plan"}
                    </button>
                </div>
            </header>

            {save.isError && (
                <p className="notice notice-error">
                    The plan wasn&apos;t saved: {save.error.message}. Your changes are still here, so
                    you can save again.
                </p>
            )}
            {serverPlan.isError && (
                <p className="notice notice-error">
                    Couldn&apos;t load your saved plan. You can keep editing; saving will retry.
                </p>
            )}

            {mealCount === 0 && (
                <p className="notice">
                    Nothing planned yet. <Link href="/recipes">Pick some recipes</Link> and add them
                    to a day.
                </p>
            )}

            <ol className="week">
                {DAYS.map((day) => (
                    <DayRow key={day} day={day} meals={days[day]} recipesById={recipesById} />
                ))}
            </ol>

            {mealCount > 0 && (
                <p className="planner-foot">
                    <Link className="btn" href="/shopping-list">
                        Make the shopping list
                    </Link>
                </p>
            )}
        </section>
    );
}
