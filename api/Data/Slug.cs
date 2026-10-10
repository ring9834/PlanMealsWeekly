using System.Text;

namespace MealPlanner.Api.Data;

public static class Slug
{
    /// <summary>"Spaghetti Aglio e Olio" → "spaghetti-aglio-e-olio"</summary>
    public static string From(string text)
    {
        var sb = new StringBuilder();
        foreach (var ch in text.Trim().ToLowerInvariant())
        {
            if (char.IsAsciiLetterOrDigit(ch)) sb.Append(ch);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        return sb.ToString().TrimEnd('-');
    }
}
