// Package db は、DB のマイグレーション（テーブルを作る SQL）をプログラムに埋め込む。
// 本番では、サーバーの起動時にここから読んで適用する（database.Migrate）。
package db

import "embed"

// Migrations は migrations フォルダの SQL ファイル。
//
//go:embed migrations/*.sql
var Migrations embed.FS
