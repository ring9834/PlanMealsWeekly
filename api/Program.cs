using System.Text.Json.Serialization;
using MealPlanner.Api.Data;
using MealPlanner.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    // Serialize enums as names ("Monday") instead of numbers, to match the TS types.
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// ***** .NET loads configuration from several sources, and later ones win:
// appsettings.json  →  appsettings.{Environment}.json  →  environment variables  →  command line
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddOpenApi();

// The browser calls the API directly (TanStack Query), so the web origin needs CORS.
// Server-side calls from Next.js (SSR/ISR) are server-to-server and don't need it.
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                  ?? ["http://localhost:3000"];
builder.Services.AddCors(o => o.AddPolicy("web", p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.Configure<RevalidationOptions>(builder.Configuration.GetSection("Revalidation"));
builder.Services.AddHttpClient<RevalidationService>(c => c.Timeout = TimeSpan.FromSeconds(5));

var app = builder.Build();

// Create the schema and seed data on startup (fine for local dev; not for production).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.GetMigrations().Any())
        await db.Database.MigrateAsync();      // once you've added migrations
    else
        await db.Database.EnsureCreatedAsync(); // until then
    await SeedData.SeedAsync(db);
}

app.MapOpenApi();                                   // /openapi/v1.json
app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "MealPlanner API")); // /swagger

app.UseCors("web");
app.MapControllers();

app.Run();
