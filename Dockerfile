# =========================================================
# Stage 1 : deps — installation des dépendances
# =========================================================
FROM node:20-alpine AS deps

# Dépendances système requises par certaines librairies natives (ex: canvas, sharp)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copier uniquement les fichiers de dépendances pour profiter du cache Docker
COPY package.json package-lock.json ./

# Installation propre des dépendances de production + dev (nécessaires au build)
RUN npm ci

# =========================================================
# Stage 2 : builder — compilation du projet Next.js
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Récupérer les node_modules depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Copier explicitement .env.local pour que Next.js puisse lire
# NEXT_PUBLIC_* lors du build (Next.js le lit automatiquement)
COPY .env.local .env.local

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# =========================================================
# Stage 3 : runner — image de production minimale
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copier les fichiers statiques publics
COPY --from=builder /app/public ./public

# Copier le build standalone généré par Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Démarrage via le serveur standalone léger de Next.js
CMD ["node", "server.js"]
