"use client";

import { useState } from "react";
import { DAYS } from "@/lib/types";
import { usePlannerStore } from "@/store/plannerStore";

/**
 * A small client "island". It works the same on the SSR list page and inside
 * the ISR recipe page: the page HTML is cached, this button's state is not.
 */
export function AddToPlanButton({
    recipeId,
    baseServings,
    compact = false,
}: {
    recipeId: number;
    baseServings: number;
    compact?: boolean;
}) {
    // Select only what this component needs, so it doesn't re-render on unrelated edits.
    const activeDay = usePlannerStore((s) => s.activeDay);
    const setActiveDay = usePlannerStore((s) => s.setActiveDay);
    const addMeal = usePlannerStore((s) => s.addMeal);
    const [addedTo, setAddedTo] = useState<string | null>(null);

    return (
        <div className={`add-to-plan ${compact ? "is-compact" : ""}`}>
            <label>
                <span className="sr-only">Day</span>
                <select value={activeDay} onChange={(e) => setActiveDay(e.target.value as typeof activeDay)}>
                    {DAYS.map((d) => (
                        <option key={d} value={d}>
                            {d}
                        </option>
                    ))}
                </select>
            </label>
            <button
                className="btn btn-primary"
                onClick={() => {
                    addMeal(recipeId, baseServings, activeDay);
                    setAddedTo(activeDay);
                }}
            >
                Add to {activeDay.slice(0, 3)}
            </button>
            <span className="sr-live" aria-live="polite">
                {addedTo ? `Added to ${addedTo}` : ""}
            </span>
        </div>
    );
}
