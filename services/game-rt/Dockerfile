# 이랑게임센터 실시간 서버 (rangu-game-rt).
#
# 게임 규칙(src/games/*)을 본 서버와 같이 쓰므로, 빌드 컨텍스트는 저장소 루트다:
#   docker build -f services/game-rt/Dockerfile -t rangu-game-rt .
#
# 실행:
#   docker run --rm -p 8080:8080 -e RT_JWT_SECRET=... -e GC_INTERNAL_SECRET=... \
#     -e RANGU_FAM_URL=https://irang.wiki rangu-game-rt

# ---------- 1. build ----------
FROM node:20-alpine AS build
WORKDIR /repo/services/game-rt
COPY services/game-rt/package.json services/game-rt/package-lock.json ./
RUN npm ci
COPY services/game-rt/tsconfig.json ./
COPY services/game-rt/src ./src
# 방 상태 머신과 게임 규칙 (esbuild 가 실제로 import 한 파일만 묶는다)
COPY src/games /repo/src/games
RUN npm run build && npm prune --omit=dev

# ---------- 2. runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY --from=build /repo/services/game-rt/node_modules ./node_modules
COPY --from=build /repo/services/game-rt/dist ./dist
COPY services/game-rt/package.json ./
USER node
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
