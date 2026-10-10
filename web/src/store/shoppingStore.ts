import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which shopping-list rows are ticked off. Pure client state. */
interface ShoppingState {
  checked: Record<number, boolean>;
  toggle: (ingredientId: number) => void;
  clearChecked: () => void;
}

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set) => ({
      checked: {},
      toggle: (id) =>
        set((s) => ({ checked: { ...s.checked, [id]: !s.checked[id] } })),
      clearChecked: () => set({ checked: {} }),
    }),
    {
      name: "mealplanner-shopping",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
