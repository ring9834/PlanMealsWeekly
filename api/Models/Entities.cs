namespace MealPlanner.Api.Models;

public class Recipe
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    /// <summary>Steps separated by newlines.</summary>
    public string Instructions { get; set; } = "";
    public int PrepMinutes { get; set; }
    /// <summary>Ingredient quantities are for this many servings.</summary>
    public int BaseServings { get; set; } = 4;
    /// <summary>Mapped to a native PostgreSQL text[] column by Npgsql.</summary>
    public List<string> Tags { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
    public List<RecipeIngredient> Ingredients { get; set; } = [];
}

public class Ingredient
{
    public int Id { get; set; }
    public required string Name { get; set; }
    /// <summary>g, ml, pcs, tbsp… One unit per ingredient keeps shopping-list math simple.</summary>
    public required string Unit { get; set; }
}

public class RecipeIngredient
{
    public int RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public int IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;
    public decimal Quantity { get; set; }
}

public class MealPlan
{
    public int Id { get; set; }
    public required string OwnerId { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<MealPlanEntry> Entries { get; set; } = [];
}

public class MealPlanEntry
{
    public int Id { get; set; }
    public int MealPlanId { get; set; }
    public DayOfWeek Day { get; set; }
    public int RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public int Servings { get; set; }
    public int SortOrder { get; set; }
}
