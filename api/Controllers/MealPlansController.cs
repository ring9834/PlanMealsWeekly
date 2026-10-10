using MealPlanner.Api.Data;
using MealPlanner.Api.Dtos;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers;

[ApiController]
[Route("api/mealplans")]
public class MealPlansController(AppDbContext db) : ControllerBase
{
    /// <summary>The saved plan. Returns an empty plan (not 404) if nothing was saved yet.</summary>
    [HttpGet("current")]
    public async Task<ActionResult<MealPlanDto>> GetCurrent(CancellationToken ct)
    {
        var plan = await db.MealPlans.AsNoTracking()
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.OwnerId == CurrentUser.Id, ct);

        return plan is null ? new MealPlanDto([], null) : ToDto(plan);
    }

    /// <summary>
    /// Replace the whole plan. The client sends its full Zustand draft, which keeps
    /// the API simple: no per-entry endpoints, and the save is all-or-nothing.
    /// </summary>
    [HttpPut("current")]
    public async Task<ActionResult<MealPlanDto>> SaveCurrent(SaveMealPlanDto dto, CancellationToken ct)
    {
        var recipeIds = dto.Entries.Select(e => e.RecipeId).Distinct().ToList();
        var known = await db.Recipes.Where(r => recipeIds.Contains(r.Id)).Select(r => r.Id).ToListAsync(ct);
        var unknown = recipeIds.Except(known).ToList();
        if (unknown.Count > 0)
            return ValidationProblem($"Unknown recipe id(s): {string.Join(", ", unknown)}");

        var plan = await db.MealPlans
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.OwnerId == CurrentUser.Id, ct);

        if (plan is null)
        {
            plan = new MealPlan { OwnerId = CurrentUser.Id };
            db.MealPlans.Add(plan);
        }

        plan.Entries.Clear();
        foreach (var e in dto.Entries)
        {
            plan.Entries.Add(new MealPlanEntry
            {
                Day = e.Day,
                RecipeId = e.RecipeId,
                Servings = Math.Clamp(e.Servings, 1, 50),
                SortOrder = e.SortOrder,
            });
        }
        plan.UpdatedAt = Clock.UtcNow();

        await db.SaveChangesAsync(ct);
        return ToDto(plan);
    }

    private static MealPlanDto ToDto(MealPlan p) => new(
        p.Entries
            .OrderBy(e => e.Day).ThenBy(e => e.SortOrder)
            .Select(e => new MealPlanEntryDto(e.Day, e.RecipeId, e.Servings, e.SortOrder))
            .ToList(),
        p.UpdatedAt);
}
