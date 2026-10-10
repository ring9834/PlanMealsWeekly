"use client";

import Link from "next/link";
import { memo } from "react";
import { DAYS, type DayOfWeek, type RecipeSummary } from "@/lib/types";
import { usePlannerStore, type PlannedMeal } from "@/store/plannerStore";

interface Props {
    day: DayOfWeek;
    meals: PlannedMeal[];
    recipesById: Map<number, RecipeSummary>;
}

/**
 * memo + stable `meals` arrays: editing Tuesday creates a new Tuesday array
 * but reuses the other six, so only Tuesday's row re-renders. Open React
 * DevTools' "Highlight updates" to watch it happen.
 */
export const DayRow = memo(function DayRow({ day, meals, recipesById }: Props) {
    const removeMeal = usePlannerStore((s) => s.removeMeal);
    const moveMeal = usePlannerStore((s) => s.moveMeal);
    const setServings = usePlannerStore((s) => s.setServings);

    return (
        <li className="day">
            <h2 className="day-name">{day}</h2>
            {meals.length === 0 ? (
                <p className="day-empty">Nothing yet</p>
            ) : (
                <ul className="meals">
                    {meals.map((meal) => {
                        const recipe = recipesById.get(meal.recipeId);
                        return (
                            <li key={meal.id} className="meal">
                                <span className="meal-title">
                                    {recipe ? (
                                        <Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link>
                                    ) : (
                                        <span className="muted">Recipe #{meal.recipeId}</span>
                                    )}
                                </span>

                                <span className="stepper" aria-label="Servings">
                                    <button
                                        aria-label="Fewer servings"
                                        onClick={() => setServings(day, meal.id, meal.servings - 1)}
                                        disabled={meal.servings <= 1}
                                    >
                                        −
                                    </button>
                                    <span>{meal.servings} servings</span>
                                    <button
                                        aria-label="More servings"
                                        onClick={() => setServings(day, meal.id, meal.servings + 1)}
                                    >
                                        +
                                    </button>
                                </span>

                                <label className="move">
                                    <span className="sr-only">Move to</span>
                                    <select
                                        value={day}
                                        onChange={(e) => moveMeal(day, e.target.value as DayOfWeek, meal.id)}
                                    >
                                        {DAYS.map((d) => (
                                            <option key={d} value={d}>
                                                {d === day ? "Move to…" : d}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <button className="remove" onClick={() => removeMeal(day, meal.id)}>
                                    Remove
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </li>
    );
});
