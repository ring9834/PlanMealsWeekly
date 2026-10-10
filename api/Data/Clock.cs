namespace MealPlanner.Api.Data;

public static class Clock
{
    /// <summary>
    /// UTC now, truncated to microseconds. PostgreSQL stores microseconds while .NET
    /// has 100ns ticks; truncating means the value we return after saving equals the
    /// value a later GET reads back. The frontend compares these to detect changes.
    /// </summary>
    public static DateTime UtcNow()
    {
        var now = DateTime.UtcNow;
        return new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
    }
}
