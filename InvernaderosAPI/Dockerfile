FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["InvernaderosAPI/InvernaderosAPI.csproj", "InvernaderosAPI/"]
RUN dotnet restore "InvernaderosAPI/InvernaderosAPI.csproj"
COPY . .
WORKDIR "/src/InvernaderosAPI"
RUN dotnet publish -c Release -o /app/out

FROM base AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "InvernaderosAPI.dll"]