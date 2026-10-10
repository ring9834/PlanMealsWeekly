import { revalidatePath } from "next/cache";

/**
 * On-demand ISR. The .NET API calls this after a recipe is created or updated,
 * so the cached page is rebuilt on the next visit instead of waiting for the
 * time-based `revalidate` window to expire.
 */
export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
        return Response.json({ message: "Invalid revalidation secret" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { slug?: string };
    if (body.slug) revalidatePath(`/recipes/${body.slug}`);
    revalidatePath("/recipes");

    return Response.json({ revalidated: true, slug: body.slug ?? null, at: Date.now() });
}
