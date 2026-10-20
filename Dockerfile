# ================================================================
#  AgentFlow Docker 镜像（ADR-0005）
#  multi-stage：build 阶段带 python3/make/g++（better-sqlite3 无预编译
#  时本地构建）；runtime 阶段仅 node:22-bookworm-slim + dist 产物 +
#  生产依赖。两阶段同 glibc（bookworm），原生模块二进制兼容。
#  数据卷：/app/data（SQLite agentflow.db）；密钥只经环境变量传入
#  （.dockerignore 含 **/.env，绝不进入镜像层）。
#  构建：docker build -t agentflow .
#  运行：docker run -p 3000:3000 -v agentflow-data:/app/data \
#          -e DEEPSEEK_API_KEY=... agentflow
# ================================================================

# ---------- build 阶段 ----------
FROM node:22-bookworm-slim AS build
# better-sqlite3 本地编译工具链（有预编译时 prebuild-install 直接命中）
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# 根 devDep playwright 仅服务宪法门禁（CI），镜像内跳过浏览器下载
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /app
COPY . .
RUN npm ci \
    && npm run build:shared \
    && npm run build:web \
    && npm run build:server \
    && npm prune --omit=dev

# ---------- runtime 阶段 ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# 目录布局与仓库一致（apps/server/dist 的仓库根解析 → /app，data → /app/data）；
# dist 产物被 .dockerignore 排除出上下文，一律自 build 阶段复制
COPY --chown=node:node --from=build /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=build /app/apps/server/package.json apps/server/
COPY --chown=node:node --from=build /app/apps/server/dist apps/server/dist
COPY --chown=node:node --from=build /app/packages/shared/package.json packages/shared/
COPY --chown=node:node --from=build /app/packages/shared/dist packages/shared/dist
COPY --chown=node:node --from=build /app/apps/web/dist apps/web/dist
COPY --chown=node:node --from=build /app/node_modules node_modules
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data
USER node
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/server/dist/server.js"]
