FROM node:22-alpine

RUN apk add --no-cache bash openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY worker/package.json worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/sde/package.json packages/sde/package.json
COPY packages/collector/package.json packages/collector/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @eve-toolkit/worker

ENV NODE_ENV=production

CMD ["node", "worker/dist/worker/src/cli.js"]
