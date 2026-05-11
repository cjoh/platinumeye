FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173
ENV STATS_FILE=/data/stats.json

RUN mkdir -p /data

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/dist ./dist

EXPOSE 5173

CMD ["npm", "start"]
