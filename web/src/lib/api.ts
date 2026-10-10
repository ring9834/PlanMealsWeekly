import type {
    MealPlan,
    MealPlanEntry,
    PagedResult,
    RecipeDetail,
    RecipeQueryParams,
    RecipeSummary,
    ShoppingListItem,
} from "./types";

/**
 * The same code runs in two places, and they reach the API differently:
 *  - On the Next.js server (SSR/ISR) inside Docker, "localhost" is the web
 *    container itself, so we use the compose service name: http://api:8080.
 *  - In the browser, requests go through the port published on your machine.
 *
 * NEXT_PUBLIC_* variables are inlined at BUILD time, which is why the web
 * Dockerfile takes NEXT_PUBLIC_API_URL as a build arg.
 */
function baseUrl(): string {
    if (typeof window === "undefined") {
        return process.env.API_INTERNAL_URL ?? "http://localhost:5000";
    }
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
        throw new ApiError(
            res.status,
            `${init?.method ?? "GET"} ${path} failed with ${res.status}`,
        );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

export function toQueryString(params: RecipeQueryParams): string {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.tag) qs.set("tag", params.tag);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    return qs.toString();
}

export const api = {
    getRecipes(params: RecipeQueryParams, init?: RequestInit) {
        const qs = toQueryString(params);
        return request<PagedResult<RecipeSummary>>(
            `/api/recipes${qs ? `?${qs}` : ""}`,
            init,
        );
    },

    getRecipe(slug: string, init?: RequestInit) {
        return request<RecipeDetail>(
            `/api/recipes/${encodeURIComponent(slug)}`,
            init,
        );
    },

    getTags(init?: RequestInit) {
        return request<string[]>("/api/recipes/tags", init);
    },

    getCurrentPlan() {
        return request<MealPlan>("/api/mealplans/current");
    },

    saveCurrentPlan(entries: MealPlanEntry[]) {
        return request<MealPlan>("/api/mealplans/current", {
            method: "PUT",
            body: JSON.stringify({ entries }),
        });
    },

    getShoppingList(entries: { recipeId: number; servings: number }[]) {
        return request<ShoppingListItem[]>("/api/shopping-list", {
            method: "POST",
            body: JSON.stringify({ entries }),
        });
    },
};
