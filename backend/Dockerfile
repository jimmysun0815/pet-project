# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 运行阶段
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

# 启动时先执行迁移（连 RDS），再启动服务
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
