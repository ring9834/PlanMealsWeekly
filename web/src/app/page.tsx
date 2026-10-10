import Link from "next/link";

// Static page: no data, rendered once at build time.
export default function HomePage() {
    return (
        <section className="home">
            <h1 className="home-title">What are we eating this week?</h1>
            <p className="lede">
                Pick recipes, drop them onto days, and get one shopping list that adds
                everything up for you.
            </p>
            <div className="home-actions">
                <Link className="btn btn-primary" href="/recipes">
                    Browse recipes
                </Link>
                <Link className="btn" href="/planner">
                    Open this week&apos;s plan
                </Link>
            </div>
        </section>
    );
}
