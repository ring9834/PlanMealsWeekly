import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";
import type { RecipeQueryParams } from "./types";

// Query key factories: one place that defines every cache key, so
// invalidation (e.g. `recipeKeys.all`) is predictable.
export const recipeKeys = {
  all: ["recipes"] as const,
  lists: () => [...recipeKeys.all, "list"] as const,
  list: (params: RecipeQueryParams) => [...recipeKeys.lists(), params] as const,
  tags: () => [...recipeKeys.all, "tags"] as const,
};

export const mealPlanKeys = {
  current: ["mealplan", "current"] as const,
};

export const shoppingListKeys = {
  forEntries: (entries: { recipeId: number; servings: number }[]) =>
    ["shopping-list", entries] as const,
};

/**
 * Turns raw URL params into a normalized object. Both the server page and the
 * client component use this, so they produce the SAME query key — which is
 * what lets the client reuse the server-prefetched data instead of refetching.
 */
export function parseRecipeParams(
  get: (key: string) => string | null | undefined,
): RecipeQueryParams {
  const params: RecipeQueryParams = {};
  const search = get("search")?.trim();
  const tag = get("tag")?.trim();
  const page = Number(get("page"));
  if (search) params.search = search;
  if (tag) params.tag = tag;
  if (Number.isInteger(page) && page > 1) params.page = page;
  return params;
}

export const recipesQuery = (params: RecipeQueryParams) =>
  queryOptions({
    queryKey: recipeKeys.list(params),
    queryFn: () => api.getRecipes(params),
  });

export const tagsQuery = () =>
  queryOptions({
    queryKey: recipeKeys.tags(),
    queryFn: () => api.getTags(),
    staleTime: 10 * 60_000,
  });

export const currentPlanQuery = () =>
  queryOptions({
    queryKey: mealPlanKeys.current,
    queryFn: () => api.getCurrentPlan(),
  });

export const shoppingListQuery = (
  entries: { recipeId: number; servings: number }[],
) =>
  queryOptions({
    queryKey: shoppingListKeys.forEntries(entries),
    queryFn: () => api.getShoppingList(entries),
    enabled: entries.length > 0,
  });
