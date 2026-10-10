import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DAYS, type DayOfWeek, type MealPlan, type MealPlanEntry } from "@/lib/types";

/**
 * CLIENT state only. Notice what is NOT here: recipe titles, descriptions,
 * ingredients. Those are server state and live in the TanStack Query cache.
 * The store keeps IDs plus the user's intent (which day, how many servings).
 */

export interface PlannedMeal {
    /** Client-only id so React keys stay stable while meals move around. */
    id: string;
    recipeId: number;
    servings: number;
}

export type WeekPlan = Record<DayOfWeek, PlannedMeal[]>;

interface PlannerState {
    days: WeekPlan;
    /** Day that "Add" buttons target. UI state, deliberately not persisted. */
    activeDay: DayOfWeek;
    /** Incremented on every edit; used to detect edits made during a save. */
    revision: number;
    isDirty: boolean;
    /** updatedAt of the server plan this draft was last in sync with. */
    lastSyncedAt: string | null;

    setActiveDay: (day: DayOfWeek) => void;
    addMeal: (recipeId: number, servings: number, day?: DayOfWeek) => void;
    removeMeal: (day: DayOfWeek, mealId: string) => void;
    moveMeal: (from: DayOfWeek, to: DayOfWeek, mealId: string) => void;
    setServings: (day: DayOfWeek, mealId: string, servings: number) => void;
    clearWeek: () => void;
    loadFromServer: (plan: MealPlan) => void;
    markSaved: (updatedAt: string | null, savedRevision: number) => void;
}

const emptyWeek = (): WeekPlan =>
    Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as WeekPlan;

const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

/** Helper for every edit: apply a change to `days` and mark the draft dirty. */
const edit = (state: PlannerState, days: WeekPlan) => ({
    days,
    isDirty: true,
    revision: state.revision + 1,
});

export const usePlannerStore = create<PlannerState>()(
    persist(
        (set) => ({
            days: emptyWeek(),
            activeDay: "Monday",
            revision: 0,
            isDirty: false,
            lastSyncedAt: null,

            setActiveDay: (day) => set({ activeDay: day }),

            addMeal: (recipeId, servings, day) =>
                set((s) => {
                    const target = day ?? s.activeDay;
                    return edit(s, {
                        ...s.days,
                        [target]: [...s.days[target], { id: newId(), recipeId, servings }],
                    });
                }),

            removeMeal: (day, mealId) =>
                set((s) =>
                    edit(s, { ...s.days, [day]: s.days[day].filter((m) => m.id !== mealId) }),
                ),

            moveMeal: (from, to, mealId) =>
                set((s) => {
                    if (from === to) return s;
                    const meal = s.days[from].find((m) => m.id === mealId);
                    if (!meal) return s;
                    return edit(s, {
                        ...s.days,
                        [from]: s.days[from].filter((m) => m.id !== mealId),
                        [to]: [...s.days[to], meal],
                    });
                }),

            setServings: (day, mealId, servings) =>
                set((s) =>
                    edit(s, {
                        ...s.days,
                        [day]: s.days[day].map((m) =>
                            m.id === mealId
                                ? { ...m, servings: Math.min(50, Math.max(1, servings)) }
                                : m,
                        ),
                    }),
                ),

            clearWeek: () => set((s) => edit(s, emptyWeek())),

            // Replace the draft with what the server has (initial load / "Discard draft").
            loadFromServer: (plan) => {
                const days = emptyWeek();
                [...plan.entries]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .forEach((e) =>
                        days[e.day].push({ id: newId(), recipeId: e.recipeId, servings: e.servings }),
                    );
                set({ days, isDirty: false, lastSyncedAt: plan.updatedAt });
            },

            // Only clear the dirty flag if nothing changed while the request was in flight.
            markSaved: (updatedAt, savedRevision) =>
                set((s) => ({
                    lastSyncedAt: updatedAt,
                    isDirty: s.revision !== savedRevision,
                })),
        }),
        {
            name: "mealplanner-draft",
            version: 1,
            // Use localStorage, not the default sessionStorage. (The default is sessionStorage because it's safer for sensitive data, but this draft is not sensitive.)
            storage: createJSONStorage(() => localStorage),
            // Persist the draft, not the UI state.
            // partialize is a function that takes the current state and returns a subset of it to be persisted. 
            // In this case, we are persisting the days, isDirty flag, lastSyncedAt timestamp, and revision number. 
            // This ensures that the user's meal plan is saved across sessions, while UI state like the active day is not persisted.
            partialize: (s) => ({
                days: s.days,
                isDirty: s.isDirty,
                lastSyncedAt: s.lastSyncedAt,
                revision: s.revision,
            }),
            // Don't read localStorage while the module loads. 
            // The server render has no localStorage, so reading it immediately would make the first client render differ from the server HTML (a hydration mismatch).
            // <Providers> calls rehydrate() after mount instead.
            skipHydration: true,
        },
    ),
);

/** Flattens the week into the API's shape. Use with useMemo, not as a selector. */
export function toEntries(days: WeekPlan): MealPlanEntry[] {
    return DAYS.flatMap((day) =>
        days[day].map((m, index) => ({
            day,
            recipeId: m.recipeId,
            servings: m.servings,
            sortOrder: index,
        })),
    );
}

export const selectMealCount = (s: PlannerState) =>
    DAYS.reduce((n, d) => n + s.days[d].length, 0);

/** True once the persisted draft has been read from localStorage. */
export function usePlannerHydrated() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(usePlannerStore.persist.hasHydrated());
        return usePlannerStore.persist.onFinishHydration(() => setHydrated(true));
    }, []);
    return hydrated;
}
