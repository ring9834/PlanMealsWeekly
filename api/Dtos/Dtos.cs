using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.Dtos;

// Responses -------------------------------------------------------------------

public record PagedResult<T>(List<T> Items, int Page, int PageSize, int TotalCount);

public record RecipeSummaryDto(
    int Id, string Slug, string Title, string Description,
    int PrepMinutes, int BaseServings, List<string> Tags);

public record RecipeIngredientDto(int IngredientId, string Name, string Unit, decimal Quantity);

public record RecipeDetailDto(
    int Id, string Slug, string Title, string Description,
    int PrepMinutes, int BaseServings, List<string> Tags,
    string Instructions, List<RecipeIngredientDto> Ingredients, DateTime UpdatedAt);

public record MealPlanEntryDto(DayOfWeek Day, int RecipeId, int Servings, int SortOrder);

public record MealPlanDto(List<MealPlanEntryDto> Entries, DateTime? UpdatedAt);

public record ShoppingListItemDto(int IngredientId, string Name, string Unit, decimal Quantity);

// Requests --------------------------------------------------------------------
// [ApiController] validates these automatically and returns 400 ProblemDetails.
// Note: MVC treats non-nullable reference types as [Required], so optional
// fields are declared nullable (string?).

public record SaveMealPlanDto([Required, MaxLength(100)] List<MealPlanEntryDto> Entries);

public record ShoppingListEntryDto(int RecipeId, [Range(1, 50)] int Servings);

public record ShoppingListRequestDto([Required, MaxLength(100)] List<ShoppingListEntryDto> Entries);

public record IngredientInputDto(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(20)] string Unit,
    [Range(0.01, 100000)] decimal Quantity);

public record UpsertRecipeDto(
    [Required, MaxLength(200)] string Title,
    [MaxLength(1000)] string? Description,
    string? Instructions,
    [Range(1, 1440)] int PrepMinutes,
    [Range(1, 50)] int BaseServings,
    List<string>? Tags,
    [Required] List<IngredientInputDto> Ingredients);
