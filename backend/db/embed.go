// Package db は、DB のマイグレーション（テーブルを作る SQL）をプログラムに埋め込む。
// 本番では、サーバーの起動時にここから読んで適用する（database.Migrate）。
package db

import "embed"

// Migrations は migrations フォルダの SQL ファイル（本体の DB 用）。
//
//go:embed migrations/*.sql
var Migrations embed.FS

// AnalyticsMigrations は analytics フォルダの SQL ファイル（アクセス解析用の DB 用）。
// 本体とは別の DB に置くので、適用済みの番号も別のテーブル（AnalyticsMigrationsTable）に記録する。
//
//go:embed analytics/*.sql
var AnalyticsMigrations embed.FS

// AnalyticsMigrationsTable は、解析用のマイグレーションの適用済みの番号を記録するテーブル。
// ローカルでは本体と同じ DB に同居させるので、schema_migrations とは別の名前にする。
const AnalyticsMigrationsTable = "analytics_schema_migrations"
