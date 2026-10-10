using MealPlanner.Api.Data;
using MealPlanner.Api.Dtos;
using MealPlanner.Api.Models;
using MealPlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers;

[ApiController]
[Route("api/recipes")]
public class RecipesController(AppDbContext db, RevalidationService revalidation) : ControllerBase
{
    /// <summary>Search and page through recipes. Used by the SSR list page and the planner.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<RecipeSummaryDto>>> GetRecipes(
        [FromQuery] string? search,
        [FromQuery] string? tag,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Recipes.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(r =>
                EF.Functions.ILike(r.Title, pattern) || EF.Functions.ILike(r.Description, pattern));
        }

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(r => r.Tags.Contains(tag)); // SQL: tag = ANY(tags)

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(r => r.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RecipeSummaryDto(
                r.Id, r.Slug, r.Title, r.Description, r.PrepMinutes, r.BaseServings, r.Tags))
            .ToListAsync(ct);

        return new PagedResult<RecipeSummaryDto>(items, page, pageSize, total);
    }

    /// <summary>All distinct tags, for the filter chips.</summary>
    [HttpGet("tags")]
    public async Task<ActionResult<List<string>>> GetTags(CancellationToken ct)
    {
        var tagLists = await db.Recipes.AsNoTracking().Select(r => r.Tags).ToListAsync(ct);
        return tagLists.SelectMany(t => t).Distinct().Order().ToList();
    }

    /// <summary>One recipe with ingredients. Used by the ISR detail page.</summary>
    [HttpGet("{slug}")]
    public async Task<ActionResult<RecipeDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        var recipe = await db.Recipes.AsNoTracking()
            .Include(r => r.Ingredients).ThenInclude(ri => ri.Ingredient)
            .FirstOrDefaultAsync(r => r.Slug == slug, ct);

        return recipe is null ? NotFound() : ToDetail(recipe);
    }

    /// <summary>Create a recipe, then ask Next.js to rebuild the affected ISR pages.</summary>
    [HttpPost]
    public async Task<ActionResult<RecipeDetailDto>> Create(UpsertRecipeDto dto, CancellationToken ct)
    {
        var slug = Slug.From(dto.Title);
        if (string.IsNullOrEmpty(slug))
            return ValidationProblem("Title must contain letters or digits.");
        if (await db.Recipes.AnyAsync(r => r.Slug == slug, ct))
            return Conflict(new { message = $"A recipe with slug '{slug}' already exists." });

        var recipe = new Recipe { Slug = slug, Title = dto.Title.Trim() };
        Apply(recipe, dto);
        await SetIngredientsAsync(recipe, dto.Ingredients, ct);

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync(ct);
        await revalidation.RevalidateRecipeAsync(slug, ct);

        return CreatedAtAction(nameof(GetBySlug), new { slug }, ToDetail(recipe));
    }

    /// <summary>
    /// Update a recipe. The slug stays the same so existing links keep working.
    /// Try it: edit a title in Swagger, then reload the recipe page.
    /// </summary>
    [HttpPut("{slug}")]
    public async Task<ActionResult<RecipeDetailDto>> Update(string slug, UpsertRecipeDto dto, CancellationToken ct)
    {
        var recipe = await db.Recipes
            .Include(r => r.Ingredients).ThenInclude(ri => ri.Ingredient)
            .FirstOrDefaultAsync(r => r.Slug == slug, ct);
        if (recipe is null) return NotFound();

        recipe.Title = dto.Title.Trim();
        Apply(recipe, dto);
        await SetIngredientsAsync(recipe, dto.Ingredients, ct);

        await db.SaveChangesAsync(ct);
        await revalidation.RevalidateRecipeAsync(slug, ct);

        return ToDetail(recipe);
    }

    private static void Apply(Recipe recipe, UpsertRecipeDto dto)
    {
        recipe.Description = dto.Description?.Trim() ?? "";
        recipe.Instructions = dto.Instructions?.Trim() ?? "";
        recipe.PrepMinutes = dto.PrepMinutes;
        recipe.BaseServings = dto.BaseServings;
        recipe.Tags = (dto.Tags ?? [])
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();
        recipe.UpdatedAt = Clock.UtcNow();
    }

    /// <summary>
    /// Find-or-create each ingredient by name, merge duplicates, then diff against the
    /// recipe's current rows: update quantities in place, add new rows, remove the rest.
    /// (Clearing and re-adding would create a second tracked entity with the same
    /// composite key, which EF rejects.)
    /// </summary>
    private async Task SetIngredientsAsync(Recipe recipe, List<IngredientInputDto> inputs, CancellationToken ct)
    {
        var merged = inputs
            .GroupBy(i => i.Name.Trim().ToLowerInvariant())
            .Select(g => (Key: g.Key, First: g.First(), Quantity: g.Sum(i => i.Quantity)))
            .ToList();

        var keys = merged.Select(m => m.Key).ToList();
        var existing = await db.Ingredients
            .Where(i => keys.Contains(i.Name.ToLower()))
            .ToDictionaryAsync(i => i.Name.ToLower(), ct);

        var kept = new HashSet<RecipeIngredient>();
        foreach (var (key, first, quantity) in merged)
        {
            if (!existing.TryGetValue(key, out var ingredient))
            {
                ingredient = new Ingredient { Name = first.Name.Trim(), Unit = first.Unit.Trim() };
                existing[key] = ingredient;
            }

            var row = ingredient.Id == 0
                ? null
                : recipe.Ingredients.FirstOrDefault(ri => ri.IngredientId == ingredient.Id);
            if (row is null)
            {
                row = new RecipeIngredient { Ingredient = ingredient, Quantity = quantity };
                recipe.Ingredients.Add(row);
            }
            else
            {
                row.Quantity = quantity;
            }
            kept.Add(row);
        }

        // Removing from the collection makes EF delete the orphaned join rows.
        recipe.Ingredients.RemoveAll(ri => !kept.Contains(ri));
    }

    private static RecipeDetailDto ToDetail(Recipe r) => new(
        r.Id, r.Slug, r.Title, r.Description, r.PrepMinutes, r.BaseServings, r.Tags,
        r.Instructions,
        r.Ingredients
            .OrderBy(i => i.Ingredient.Name)
            .Select(i => new RecipeIngredientDto(i.IngredientId, i.Ingredient.Name, i.Ingredient.Unit, i.Quantity))
            .ToList(),
        r.UpdatedAt);
}
