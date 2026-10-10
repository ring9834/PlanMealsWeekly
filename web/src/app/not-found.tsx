import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty">
      <h1>That page doesn&apos;t exist</h1>
      <p>The recipe may have been renamed or removed.</p>
      <Link className="btn" href="/recipes">
        Back to recipes
      </Link>
    </section>
  );
}
