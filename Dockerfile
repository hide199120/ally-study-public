# 本番用のイメージ（フロントと API を 1 つのサーバーから配る）
#   Render などのホスティングはこのファイルでビルドする。ローカル開発は docker-compose.yml を使う
#   docker build -t ally-study .

# ---- 1. フロントをビルドする ----
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. API サーバーをビルドする ----
FROM golang:1.27-alpine AS api
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- 3. 実行用（ビルド済みのファイルだけを載せた軽いイメージ） ----
FROM alpine:3.22
# クラウドの DB と暗号化（TLS）でつなぐために、証明書を入れておく
RUN apk add --no-cache ca-certificates && adduser -D -H app
USER app
COPY --from=api /out/server /server
COPY --from=web /web/dist /public
ENV PORT=8080 \
    GIN_MODE=release \
    STATIC_DIR=/public
EXPOSE 8080
ENTRYPOINT ["/server"]
