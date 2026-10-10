using MealPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Data;

/// <summary>Ten starter recipes. Add more to make pagination worth testing (page size is 12).</summary>
public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Recipes.AnyAsync(ct)) return;

        var ingredients = new Dictionary<string, Ingredient>();
        Ingredient I(string name, string unit)
        {
            if (!ingredients.TryGetValue(name, out var i))
                ingredients[name] = i = new Ingredient { Name = name, Unit = unit };
            return i;
        }

        // Unlike lambda expressions assigned to variables, local functions do not require a delegate allocation if they are only ever called directly as methods. This makes them more efficient for this use case
        var now = Clock.UtcNow();
        Recipe R(string title, string description, int minutes, int servings, string[] tags,
                 string[] steps, params (string Name, string Unit, decimal Qty)[] items) => new()
        {
            Slug = Slug.From(title),
            Title = title,
            Description = description,
            PrepMinutes = minutes,
            BaseServings = servings,
            Tags = [.. tags],
            Instructions = string.Join('\n', steps),
            UpdatedAt = now,
            Ingredients = items
                .Select(x => new RecipeIngredient { Ingredient = I(x.Name, x.Unit), Quantity = x.Qty })
                .ToList(),
        };

        db.Recipes.AddRange(
            R("Spaghetti Aglio e Olio", "Garlic, chilli and olive oil pasta from the pantry.", 20, 4,
                ["italian", "vegetarian", "quick"],
                ["Cook the spaghetti in well-salted water.",
                 "Gently fry sliced garlic and chilli flakes in the olive oil until pale gold.",
                 "Toss the drained pasta with the oil, a splash of pasta water and the parsley."],
                ("Spaghetti", "g", 400), ("Garlic", "cloves", 6), ("Olive oil", "tbsp", 6),
                ("Chilli flakes", "tsp", 1), ("Parsley", "g", 20)),

            R("Chicken and Broccoli Stir-Fry", "Weeknight stir-fry with ginger, garlic and soy.", 25, 4,
                ["asian", "high-protein"],
                ["Start the rice.",
                 "Sear sliced chicken in a very hot pan, then set aside.",
                 "Stir-fry broccoli, garlic and ginger for three minutes.",
                 "Return the chicken, add soy sauce, and toss until glossy. Serve over rice."],
                ("Chicken breast", "g", 500), ("Broccoli", "g", 300), ("Soy sauce", "tbsp", 3),
                ("Garlic", "cloves", 3), ("Ginger", "g", 15), ("Rice", "g", 300)),

            R("Chickpea and Spinach Curry", "Creamy coconut curry that's ready in half an hour.", 30, 4,
                ["vegan", "indian"],
                ["Soften chopped onion, then add garlic and curry powder for a minute.",
                 "Add chickpeas and coconut milk; simmer for 15 minutes.",
                 "Stir in the spinach until wilted. Serve with rice."],
                ("Chickpeas (canned)", "g", 800), ("Onion", "pcs", 2), ("Garlic", "cloves", 4),
                ("Coconut milk", "ml", 400), ("Curry powder", "tbsp", 2), ("Spinach", "g", 150),
                ("Rice", "g", 300)),

            R("Greek Salad", "Tomato, cucumber, olives and a slab of feta.", 15, 4,
                ["vegetarian", "quick", "salad"],
                ["Cut the tomatoes and cucumber into chunks and slice the onion thinly.",
                 "Add olives, top with the feta, and dress with olive oil."],
                ("Tomato", "pcs", 4), ("Cucumber", "pcs", 1), ("Onion", "pcs", 1),
                ("Feta", "g", 200), ("Kalamata olives", "g", 100), ("Olive oil", "tbsp", 3)),

            R("Beef Tacos", "Spiced mince with fresh tomato and cheese.", 25, 4,
                ["mexican"],
                ["Brown the mince with diced onion.",
                 "Add taco seasoning and a splash of water; simmer until thick.",
                 "Fill warm tortillas with beef, diced tomato and grated cheese."],
                ("Beef mince", "g", 500), ("Tortillas", "pcs", 8), ("Onion", "pcs", 1),
                ("Tomato", "pcs", 2), ("Cheddar", "g", 150), ("Taco seasoning", "tbsp", 2)),

            R("Overnight Oats", "Make it the night before, eat it on the way out.", 10, 4,
                ["breakfast", "vegetarian", "quick"],
                ["Mix oats, milk, yoghurt and honey in a container.",
                 "Refrigerate overnight. Top with sliced banana in the morning."],
                ("Rolled oats", "g", 200), ("Milk", "ml", 500), ("Greek yoghurt", "g", 200),
                ("Honey", "tbsp", 2), ("Banana", "pcs", 2)),

            R("Lemon Garlic Salmon", "Oven-baked salmon with asparagus on one tray.", 25, 4,
                ["high-protein", "quick"],
                ["Heat the oven to 200°C.",
                 "Lay salmon and asparagus on a tray; drizzle with oil, garlic and lemon.",
                 "Bake for 12 to 15 minutes."],
                ("Salmon fillet", "pcs", 4), ("Lemon", "pcs", 1), ("Garlic", "cloves", 3),
                ("Olive oil", "tbsp", 2), ("Asparagus", "g", 300)),

            R("Mushroom Risotto", "Slow-stirred and worth it.", 45, 4,
                ["vegetarian", "italian"],
                ["Fry mushrooms in half the butter until browned; set aside.",
                 "Soften onion, add rice and toast for a minute.",
                 "Add hot stock a ladle at a time, stirring, for about 20 minutes.",
                 "Stir in mushrooms, parmesan and the rest of the butter."],
                ("Arborio rice", "g", 300), ("Mushrooms", "g", 400), ("Onion", "pcs", 1),
                ("Vegetable stock", "ml", 1200), ("Parmesan", "g", 60), ("Butter", "g", 30)),

            R("Red Lentil Soup", "Cheap, filling, and better the next day.", 35, 6,
                ["vegan", "soup"],
                ["Soften onion, carrot and garlic with the cumin.",
                 "Add lentils and stock; simmer for 20 minutes.",
                 "Blend until smooth, or leave it chunky."],
                ("Red lentils", "g", 300), ("Carrot", "pcs", 2), ("Onion", "pcs", 1),
                ("Garlic", "cloves", 3), ("Vegetable stock", "ml", 1500), ("Ground cumin", "tsp", 2)),

            R("Shakshuka", "Eggs poached in a spiced tomato and capsicum sauce.", 30, 4,
                ["vegetarian", "breakfast"],
                ["Soften onion and sliced capsicum; add garlic and cumin.",
                 "Pour in the tomatoes and simmer for 10 minutes.",
                 "Make wells, crack in the eggs, cover until just set. Crumble feta over."],
                ("Eggs", "pcs", 6), ("Canned tomatoes", "g", 800), ("Onion", "pcs", 1),
                ("Capsicum", "pcs", 2), ("Garlic", "cloves", 3), ("Ground cumin", "tsp", 1),
                ("Feta", "g", 100)));

        await db.SaveChangesAsync(ct);
    }
}
