# Giai đoạn Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy các file .csproj với đường dẫn có chữ "src/"
COPY ["src/Fiebo.API/Fiebo.API.csproj", "src/Fiebo.API/"]
COPY ["src/Fiebo.Application/Fiebo.Application.csproj", "src/Fiebo.Application/"]
COPY ["src/Fiebo.Domain/Fiebo.Domain.csproj", "src/Fiebo.Domain/"]
COPY ["src/Fiebo.Infrastructure/Fiebo.Infrastructure.csproj", "src/Fiebo.Infrastructure/"]

# Restore packages
RUN dotnet restore "src/Fiebo.API/Fiebo.API.csproj"

# Copy toàn bộ code vào và Build
COPY . .
WORKDIR "/source/src/Fiebo.API"
RUN dotnet publish "Fiebo.API.csproj" -c Release -o /app/publish

# Giai đoạn Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Fiebo.API.dll"]