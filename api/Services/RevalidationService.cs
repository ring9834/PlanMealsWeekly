using Microsoft.Extensions.Options;

namespace MealPlanner.Api.Services;

public class RevalidationOptions
{
    /// <summary>Where the API can reach Next.js. In Docker: http://web:3000.</summary>
    /// ***** .NET loads configuration from several sources, and later ones win:
    // appsettings.json  →  appsettings.{Environment}.json  →  environment variables  →  command line
    public string? WebUrl { get; set; }
    public string? Secret { get; set; }
}

/// <summary>
/// *** This is a webhook receiver or cache-invalidation endpoint. The call direction is from the API to Next.js, not the other way around. The API calls this endpoint to tell Next.js to rebuild ISR pages after data changes.
/// Calls the Next.js /api/revalidate route so ISR pages rebuild right after data
/// changes. Failures are logged, not thrown: the data is saved either way, and the
/// page will still refresh when its time-based revalidate window expires.
/// </summary>
public class RevalidationService(
    HttpClient http,
    IOptions<RevalidationOptions> options,
    ILogger<RevalidationService> logger)
{
    public async Task RevalidateRecipeAsync(string slug, CancellationToken ct = default)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.WebUrl) || string.IsNullOrWhiteSpace(o.Secret))
        {
            logger.LogInformation("Revalidation isn't configured; skipping for {Slug}", slug);
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{o.WebUrl.TrimEnd('/')}/api/revalidate")
            {
                // Is Content here the requestion body? I think so, but the docs are unclear. It works, though.
                Content = JsonContent.Create(new { slug }),
            };
            request.Headers.Add("x-revalidate-secret", o.Secret);

            using var response = await http.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
                logger.LogInformation("Revalidated ISR pages for {Slug}", slug);
            else
                logger.LogWarning("Revalidation for {Slug} returned {Status}", slug, (int)response.StatusCode);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Couldn't reach Next.js to revalidate {Slug}", slug);
        }
    }
}
