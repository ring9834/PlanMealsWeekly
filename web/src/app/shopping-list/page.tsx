import type { Metadata } from "next";
import { ShoppingList } from "@/components/ShoppingList";

export const metadata: Metadata = { title: "Shopping list" };

// The page shell is static; the list itself is fetched in the browser (CSR)
// because it depends on the draft plan in localStorage.
export default function ShoppingListPage() {
    return <ShoppingList />;
}
