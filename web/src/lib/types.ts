// Mirrors the DTOs in api/Dtos. Keep these in sync by hand (or generate them
// from /openapi/v1.json later as a stretch goal).

export const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS)[number];

export interface RecipeSummary {
    id: number;
    slug: string;
    title: string;
    description: string;
    prepMinutes: number;
    baseServings: number;
    tags: string[];
}

export interface RecipeIngredient {
    ingredientId: number;
    name: string;
    unit: string;
    quantity: number;
}

export interface RecipeDetail extends RecipeSummary {
    instructions: string;
    ingredients: RecipeIngredient[];
    updatedAt: string;
}

export interface PagedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface RecipeQueryParams {
    search?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
}

export interface MealPlanEntry {
    day: DayOfWeek;
    recipeId: number;
    servings: number;
    sortOrder: number;
}

export interface MealPlan {
    entries: MealPlanEntry[];
    updatedAt: string | null;
}

export interface ShoppingListItem {
    ingredientId: number;
    name: string;
    unit: string;
    quantity: number;
}
