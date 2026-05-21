FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY InvernaderosAPI.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish InvernaderosAPI.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

EXPOSE 10000

ENTRYPOINT ["dotnet", "InvernaderosAPI.dll"]
