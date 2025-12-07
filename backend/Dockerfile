FROM node:22-alpine

RUN apk add --no-cache bash openssl

WORKDIR /app

COPY package.json package-lock.json ./

COPY backend/package.json backend/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace backend
RUN npm run prisma:generate --workspace @eve-toolkit/db

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start", "--workspace", "backend"]
