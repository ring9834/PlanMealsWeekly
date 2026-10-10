using MealPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanEntry> MealPlanEntries => Set<MealPlanEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Recipe>(e =>
        {
            e.HasIndex(r => r.Slug).IsUnique();
            e.Property(r => r.Slug).HasMaxLength(200);
            e.Property(r => r.Title).HasMaxLength(200);
        });

        b.Entity<Ingredient>(e =>
        {
            e.HasIndex(i => i.Name).IsUnique();
            e.Property(i => i.Name).HasMaxLength(100);
            e.Property(i => i.Unit).HasMaxLength(20);
        });

        b.Entity<RecipeIngredient>(e =>
        {
            e.HasKey(x => new { x.RecipeId, x.IngredientId });
            e.Property(x => x.Quantity).HasPrecision(10, 2);
            e.HasOne(x => x.Recipe).WithMany(r => r.Ingredients)
                .HasForeignKey(x => x.RecipeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Ingredient).WithMany()
                .HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<MealPlan>(e =>
        {
            e.HasIndex(p => p.OwnerId).IsUnique(); // one current plan per user
            e.HasMany(p => p.Entries).WithOne()
                .HasForeignKey(x => x.MealPlanId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<MealPlanEntry>(e =>
        {
            e.HasOne(x => x.Recipe).WithMany()
                .HasForeignKey(x => x.RecipeId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
