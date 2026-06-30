FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json tsconfig.json README.md replit.md ./
COPY lib ./lib
COPY scripts ./scripts
COPY artifacts ./artifacts

ENV PORT=4173
ENV BASE_PATH=/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
RUN pnpm --filter @workspace/nameplates-express run build

FROM deps AS api

WORKDIR /app
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]

FROM nginx:1.27-alpine AS web

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=deps /app/artifacts/nameplates-express/dist/public /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
