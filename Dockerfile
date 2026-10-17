FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM oven/bun:1.2-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3000
CMD ["bun", "run", "server/index.ts"]
