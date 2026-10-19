# CHOLIS School360 Lite — one container that runs the whole app.
# IBM Cloud Code Engine uses this file to build and start the app.

# 1) Build the website (React)
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# 2) Build the server (Express)
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --no-audit --no-fund
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# 3) Final, small image: server + built website
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/tmp/school360-data \
    CLIENT_DIST_DIR=/app/client/dist
WORKDIR /app
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=client-build /app/client/dist ./client/dist
USER node
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
