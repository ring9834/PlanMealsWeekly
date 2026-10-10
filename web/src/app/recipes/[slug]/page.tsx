import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToPlanButton } from "@/components/AddToPlanButton";
import { api, ApiError } from "@/lib/api";
import { formatMinutes, formatQuantity } from "@/lib/format";

/**
 * ISR: the HTML is cached and served to everyone. After `revalidate` seconds,
 * the next visitor still gets the cached page while Next.js rebuilds it in the
 * background. The API can also force a rebuild via /api/revalidate.
 *
 * Note: `next dev` re-renders on every request. Use the Docker build
 * (or `npm run build && npm start`) to actually see ISR caching.
 */
export const revalidate = 60;

/**
 * Pages to pre-build at build time. During `docker build` the API isn't
 * running, so this returns [] and every recipe is built on its first visit
 * (then cached) instead.
 */
export async function generateStaticParams() {
  // The effect depends on whether the API is reachable at build time:
  // - Case A — API is running at build time. api.getRecipes({ pageSize: 100 }) succeeds. Returns up to 100 slugs.Next.js pre-renders those 100 recipe pages during the build.
  // - Case B — API is not running at build time (the Docker build scenario). api.getRecipes({ pageSize: 100 }) fails. Returns []. Next.js defers the first build of each recipe page to the first request, then caches it for subsequent requests.
  try {
    const { items } = await api.getRecipes({ pageSize: 100 });
    return items.map((r) => ({ slug: r.slug }));
  } catch {
    // [] doesn't disable ISR — it just defers the first build of each page from build time to first-request time. After that first request, the page is cached and behaves exactly like a build-time-generated one.
    return [];
  }
}

// cache() dedupes the call between generateMetadata and the page.
const getRecipe = cache(async (slug: string) => {
  try {
    return await api.getRecipe(slug, { next: { revalidate } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: recipe.title, description: recipe.description } : {};
}

export default async function RecipePage({ params }: { params: Params }) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();

  const steps = recipe.instructions.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <article className="recipe">
      <Link href="/recipes" className="back">
        All recipes
      </Link>
      <header className="recipe-head">
        <h1>{recipe.title}</h1>
        <p className="lede">{recipe.description}</p>
        <div className="recipe-meta">
          <span>{formatMinutes(recipe.prepMinutes)}</span>
          <span>Serves {recipe.baseServings}</span>
          {recipe.tags.map((t) => (
            <span key={t} className="tag is-static">
              {t}
            </span>
          ))}
        </div>
        <AddToPlanButton recipeId={recipe.id} baseServings={recipe.baseServings} />
      </header>

      <div className="recipe-body">
        <section>
          <h2>Ingredients</h2>
          <ul className="ingredients">
            {recipe.ingredients.map((i) => (
              <li key={i.ingredientId}>
                <span className="qty">
                  {formatQuantity(i.quantity)} {i.unit}
                </span>
                <span>{i.name}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Method</h2>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {/* Watch this timestamp to see when the page was last regenerated. */}
      <p className="generated">
        Page built {new Date().toISOString()} · recipe updated {recipe.updatedAt}
      </p>
    </article>
  );
}
