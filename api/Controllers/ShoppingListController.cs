using MealPlanner.Api.Data;
using MealPlanner.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers;

[ApiController]
[Route("api/shopping-list")]
public class ShoppingListController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Builds a combined list from plan entries. Takes entries in the body rather
    /// than reading the saved plan, so it also works for an unsaved draft.
    /// Each ingredient is scaled by servings / BaseServings, then summed.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<List<ShoppingListItemDto>>> Build(ShoppingListRequestDto dto, CancellationToken ct)
    {
        if (dto.Entries.Count == 0) return new List<ShoppingListItemDto>();

        var ids = dto.Entries.Select(e => e.RecipeId).Distinct().ToList();
        var recipes = await db.Recipes.AsNoTracking()
            .Where(r => ids.Contains(r.Id))
            .Include(r => r.Ingredients).ThenInclude(ri => ri.Ingredient)
            .ToDictionaryAsync(r => r.Id, ct);

        var items = dto.Entries
            .Where(e => recipes.ContainsKey(e.RecipeId))
            .SelectMany(e =>
            {
                var recipe = recipes[e.RecipeId];
                var factor = (decimal)e.Servings / Math.Max(1, recipe.BaseServings);
                return recipe.Ingredients.Select(ri => (ri.Ingredient, Quantity: ri.Quantity * factor));
            })
            .GroupBy(x => x.Ingredient.Id)
            .Select(g =>
            {
                var ingredient = g.First().Ingredient;
                return new ShoppingListItemDto(
                    ingredient.Id, ingredient.Name, ingredient.Unit, Math.Round(g.Sum(x => x.Quantity), 2));
            })
            .OrderBy(i => i.Name)
            .ToList();

        return items;
    }
}
