# ---- ビルド用ステージ ----
FROM golang:1.27-alpine AS build
WORKDIR /src

# 依存ライブラリを先にダウンロードしておく（go.mod が変わらない限りキャッシュが効く）
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

# ---- 実行用ステージ（ビルド済みのバイナリだけを載せた軽量イメージ） ----
FROM alpine:3.22
RUN adduser -D -H app
USER app
COPY --from=build /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
