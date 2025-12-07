FROM node:22-alpine

RUN apk add --no-cache bash openssl

WORKDIR /app

COPY package.json package-lock.json ./

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/logger/package.json packages/logger/package.json

RUN npm ci

COPY . .

ENV DATABASE_URL="postgres://user:pass@localhost:5432/dummy"
RUN npm run prisma:generate --workspace @eve-toolkit/db

RUN npm run build --workspace @eve-toolkit/db

RUN npm run build --workspace backend

ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app/backend
CMD ["node", "dist/server.js"]