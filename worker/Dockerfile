FROM node:22-alpine

RUN apk add --no-cache bash openssl

WORKDIR /app

COPY package.json package-lock.json ./

COPY backend/package.json backend/package.json
COPY worker/package.json worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/sde/package.json packages/sde/package.json
COPY packages/collector/package.json packages/collector/package.json
COPY packages/logger/package.json packages/logger/package.json

RUN npm ci

COPY . .

ENV DATABASE_URL="postgres://user:pass@localhost:5432/dummy"
RUN npm run prisma:generate --workspace @eve-toolkit/db

RUN npm run build --workspace @eve-toolkit/db

RUN npm run build --workspace @eve-toolkit/logger

RUN npm run build --workspace @eve-toolkit/worker

ENV NODE_ENV=production

WORKDIR /app/worker
CMD ["node", "dist/worker/src/cli.js"]
