"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toQueryString } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import { parseRecipeParams, recipesQuery, tagsQuery } from "@/lib/queries";
import type { RecipeQueryParams } from "@/lib/types";
import { AddToPlanButton } from "./AddToPlanButton";

const PAGE_SIZE = 12; // must match the API default

/**
 * Filters live in the URL, not in Zustand: they should survive a refresh, be
 * shareable, and be readable by the server for SSR. Zustand is for state that
 * has no URL and no server copy (the draft plan).
 */
export function RecipeBrowser() {
    const searchParams = useSearchParams();
    const params = parseRecipeParams((k) => searchParams.get(k));
    const queryClient = useQueryClient();

    const recipes = useQuery({
        ...recipesQuery(params),
        placeholderData: keepPreviousData, // keep showing the old page while the next loads
    });
    const tags = useQuery(tagsQuery());

    // Typing is local state; the URL (and therefore the query) updates after a pause.
    const [searchText, setSearchText] = useState(params.search ?? "");
    useEffect(() => {
        const id = setTimeout(() => {
            if ((params.search ?? "") !== searchText.trim()) {
                setParams({ ...params, search: searchText.trim() || undefined, page: undefined });
            }
        }, 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText]);

    const total = recipes.data?.totalCount ?? 0;
    const page = params.page ?? 1;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Prefetch the next page so "Next" feels instant.
    useEffect(() => {
        if (page < pageCount)
            // queryClient.query runs that query imperatively, outside of React, and stores the result in the cache under that query key.
            // The next time a component calls useQuery with that key, it gets the cached result instead of refetching.
            void queryClient.query(recipesQuery({ ...params, page: page + 1 }));
        // void just discards the returned Promise. It tells the linter "I intentionally don't await this" and avoids an unhandled-promise warning. 
        // The effect doesn't care about the result — it's just warming the cache.
    }, [page, pageCount, params, queryClient]);

    return (
        <section>
            <header className="section-head">
                <h1>Recipes</h1>
                <p className="muted">
                    {recipes.isPending ? "Loading…" : `${total} ${total === 1 ? "recipe" : "recipes"}`}
                    {recipes.isFetching && !recipes.isPending ? " · updating" : ""}
                </p>
            </header>

            <div className="filters">
                <label className="search">
                    <span className="sr-only">Search recipes</span>
                    <input
                        type="search"
                        placeholder="Search by name or description"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </label>
                <div className="tags" role="group" aria-label="Filter by tag">
                    <button
                        className="tag"
                        aria-pressed={!params.tag}
                        onClick={() => setParams({ ...params, tag: undefined, page: undefined })}
                    >
                        All
                    </button>
                    {tags.data?.map((tag) => (
                        <button
                            key={tag}
                            className="tag"
                            aria-pressed={params.tag === tag}
                            onClick={() => setParams({ ...params, tag, page: undefined })}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {recipes.isError && (
                <p className="notice notice-error">
                    Couldn&apos;t load recipes. Check that the API is running on{" "}
                    {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}, then{" "}
                    <button className="link" onClick={() => recipes.refetch()}>
                        try again
                    </button>
                    .
                </p>
            )}

            {recipes.data && recipes.data.items.length === 0 && (
                <p className="notice">No recipes match that. Try a different word or tag.</p>
            )}

            <ul className={`recipe-grid ${recipes.isPlaceholderData ? "is-stale" : ""}`}>
                {recipes.data?.items.map((r) => (
                    <li key={r.id} className="recipe-card">
                        <Link href={`/recipes/${r.slug}`} className="recipe-link">
                            <h2>{r.title}</h2>
                            <p>{r.description}</p>
                        </Link>
                        <div className="recipe-meta">
                            <span>{formatMinutes(r.prepMinutes)}</span>
                            <span>Serves {r.baseServings}</span>
                        </div>
                        <AddToPlanButton recipeId={r.id} baseServings={r.baseServings} compact />
                    </li>
                ))}
            </ul>

            {pageCount > 1 && (
                <nav className="pager" aria-label="Pagination">
                    <button
                        className="btn"
                        disabled={page <= 1}
                        onClick={() => setParams({ ...params, page: page - 1 })}
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {pageCount}
                    </span>
                    <button
                        className="btn"
                        disabled={page >= pageCount}
                        onClick={() => setParams({ ...params, page: page + 1 })}
                    >
                        Next
                    </button>
                </nav>
            )}
        </section>
    );
}

/**
 * Updates the URL without a server round trip. Next.js syncs
 * window.history.replaceState with useSearchParams, so the component
 * re-renders, the query key changes, and TanStack Query fetches from the browser.
 */
function setParams(next: RecipeQueryParams) {
    const qs = toQueryString(next);
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}
