namespace MealPlanner.Api.Data;

/// <summary>
/// Stand-in for authentication. Every request belongs to the same user for now.
/// Stretch goal: add JWT auth and read the id from User.FindFirst("sub").
/// </summary>
public static class CurrentUser
{
    public const string Id = "demo-user";
}
