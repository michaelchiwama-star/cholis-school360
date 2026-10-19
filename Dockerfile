# CHOLIS School360 Lite — one container that runs the whole app.
# The app's code is packed in school360-source.bundle (a zip file).

# 0) Unpack the app's code
FROM node:20-alpine AS source
WORKDIR /src
COPY school360-source.bundle ./
RUN (command -v unzip >/dev/null 2>&1 || apk add --no-cache unzip) \
 && unzip -q school360-source.bundle \
 && rm school360-source.bundle

# 1) Build the website (React)
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY --from=source /src/client/package*.json ./
RUN npm install --no-audit --no-fund
COPY --from=source /src/client/ ./
RUN npm run build

# 2) Build the server (Express)
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY --from=source /src/server/package*.json ./
RUN npm install --no-audit --no-fund
COPY --from=source /src/server/ ./
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
