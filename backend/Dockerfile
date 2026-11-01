# Carteira B3 — imagem do backend (D24, D52). Uma imagem para api e worker; muda só o comando.
# Contexto de build: a raiz do repositório (precisa de prisma/ e do Prisma CLI da raiz).
#   docker build -f backend/Dockerfile --target runtime -t carteira-b3-backend .
#   docker build -f backend/Dockerfile --target migrate -t carteira-b3-migrate .
# Uso normal: docker compose --profile app up -d --build (ver README).

# ---- Ferramentas de banco da raiz (Prisma CLI) ----
FROM node:24-slim AS root-tools
# OpenSSL: the Prisma migrate engine needs it and the slim image does not ship it.
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/docker/db-host-entrypoint.sh /usr/local/bin/db-host-entrypoint.sh
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma.config.ts ./
COPY prisma ./prisma

# ---- migrate: aplica as migrations existentes (prisma migrate deploy) e termina ----
# Só aplica o que já está em prisma/ (do agente de banco); nunca cria nem altera migration.
FROM root-tools AS migrate
ENTRYPOINT ["sh", "/usr/local/bin/db-host-entrypoint.sh"]
CMD ["npx", "--no-install", "prisma", "migrate", "deploy"]

# ---- prod-deps: só as dependências de produção do backend (em cache enquanto o package-lock não muda) ----
FROM node:24-slim AS prod-deps
WORKDIR /repo/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- build: gera o Prisma Client e compila ----
FROM root-tools AS build
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --no-audit --no-fund
COPY backend ./backend
# prisma.config.ts exige as URLs ao carregar; o generate não conecta no banco.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    SHADOW_DATABASE_URL=postgresql://build:build@localhost:5432/build_shadow \
    npm run db:generate
RUN cd backend && npm run build

# ---- runtime: só dist/ e dependências de produção, usuário sem privilégios ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
COPY backend/docker/db-host-entrypoint.sh /usr/local/bin/db-host-entrypoint.sh
WORKDIR /app/backend
COPY --from=build --chown=node:node /repo/backend/package.json ./
COPY --from=prod-deps --chown=node:node /repo/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/backend/dist ./dist
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/db-host-entrypoint.sh"]
# api por padrão; o worker usa: node dist/main.worker.js
CMD ["node", "dist/main.api.js"]
