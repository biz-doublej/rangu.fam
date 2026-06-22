# 랑구 택틱스 게임 서버(.NET 8 WebSocket) — Cloud Run.
#
# ⚠️ 빌드 컨텍스트 = game/ (proto + Engine 프로젝트 참조 때문). 레포 루트가 아님.
#   docker build -f game/rangu-tactics-server/Dockerfile -t rangu-tactics-server game/
#   docker run --rm -p 8080:8080 -e PORT=8080 rangu-tactics-server
#
# Cloud Run 은 WebSocket 지원(타임아웃 ↑ 권장). $PORT 로 0.0.0.0 바인딩(Program.cs 처리).

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 1) 프로젝트 파일 먼저 복사 → restore 레이어 캐시
COPY proto/RanguTactics.Proto.csproj proto/
COPY RanguTactics.Engine/RanguTactics.Engine.csproj RanguTactics.Engine/
COPY rangu-tactics-server/RanguTactics.Server.csproj rangu-tactics-server/
RUN dotnet restore rangu-tactics-server/RanguTactics.Server.csproj

# 2) 나머지 소스(.proto 포함 → Grpc.Tools 가 빌드 시 C# 생성)
COPY proto/ proto/
COPY RanguTactics.Engine/ RanguTactics.Engine/
COPY rangu-tactics-server/ rangu-tactics-server/
RUN dotnet publish rangu-tactics-server/RanguTactics.Server.csproj -c Release -o /app /p:UseAppHost=false

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Cloud Run 이 PORT 주입(기본 8080). 업스트림(Deck/JWKS/Metadata)·시크릿은 배포 시 --set-env-vars/--set-secrets.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "RanguTactics.Server.dll"]
