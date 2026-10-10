import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { RecipeBrowser } from "@/components/RecipeBrowser";
import { getQueryClient } from "@/lib/getQueryClient";
import { parseRecipeParams, recipesQuery, tagsQuery } from "@/lib/queries";

export const metadata: Metadata = { title: "Recipes" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * SSR: reading searchParams makes this page render on every request.
 * Other signals like cookies(), headers() makes it render on every request too.
 * export const dynamic = "force-dynamic" would also force SSR, but it's not needed here because searchParams already does that.
 * A fetch with cache: "no-store" would also force SSR, but it's not needed here because the queries are prefetched into the cache instead of fetched directly.
 *
 * The server prefetches into a TanStack Query cache, dehydrates it into the
 * HTML, and <HydrationBoundary> seeds the browser's cache with it. The client
 * component then calls useQuery with the same key and gets the data instantly.
 * Later filter changes are fetched client-side only.
 */
export default async function RecipesPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    const params = parseRecipeParams((key) => {
        const value = sp[key];
        // normalizes a string | string[] | undefined into a single string | undefined by taking the first element when duplicates exist — a standard, safe way to handle Next.js searchParams.
        return Array.isArray(value) ? value[0] : value;
    });

    // This must be per-request, not a module-level singleton. On the server, a shared singleton would leak one user's data into another user's response. That's why the code calls getQueryClient() (which presumably returns a new instance on the server) rather than importing a shared client.
    const queryClient = getQueryClient();
    // prefetchQuery never throws; if the API is down the client will retry.
    // Promise.all is used to prefetch both queries in parallel, so the page doesn't wait for one to finish before starting the other.
    await Promise.all([
        // Runs the query's queryFn on the server, awaits it, and stores the result in the cache under the query's key.
        queryClient.query(recipesQuery(params)),
        queryClient.query(tagsQuery()),
    ]);

    // dehydrate(queryClient) converts the in-memory cache into a plain JSON-serializable object that can be embedded in the HTML. 
    // The client-side <HydrationBoundary> reads this object and populates the browser's cache with it, so the client can reuse the server-fetched data instead of refetching.
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RecipeBrowser />
        </HydrationBoundary>
    );
    // <RecipeBrowser> renders the same query keys as the server, so it can reuse the server-fetched data instead of refetching. Later filter changes are fetched client-side only.
    // useQuery(recipesQuery(params)) 
}
