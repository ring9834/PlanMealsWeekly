# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# Restore first so the package layer is cached until the .csproj changes.
COPY MealPlanner.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# ---- run ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
# .NET 8+ images listen on 8080 and run as the non-root "app" user by default.
EXPOSE 8080
ENTRYPOINT ["dotnet", "MealPlanner.Api.dll"]
