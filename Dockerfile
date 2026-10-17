FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json ./
COPY public/ ./public/
COPY src/ ./src/
EXPOSE 3000
CMD ["bun","run","start"]
