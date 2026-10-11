package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"path"
	"sort"
	"strconv"
	"strings"
)

// migration は 1 つの .up.sql ファイル。
type migration struct {
	version uint64
	name    string
}

// Migrate は、まだ適用していないマイグレーション（*.up.sql）を番号の小さい順に適用する。
// 適用済みの番号は golang-migrate と同じ schema_migrations テーブルに記録するので、
// ローカルの docker compose（migrate コンテナ）と混ぜて使っても食い違わない。
func Migrate(ctx context.Context, db *sql.DB, fsys fs.FS, dir string) error {
	if _, err := db.ExecContext(ctx,
		`CREATE TABLE IF NOT EXISTS schema_migrations (version BIGINT NOT NULL, dirty BOOLEAN NOT NULL, PRIMARY KEY (version))`,
	); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	current, dirty, err := currentVersion(ctx, db)
	if err != nil {
		return err
	}
	if dirty {
		return fmt.Errorf("migration %d が途中で失敗したままです。DB を確認してから schema_migrations を直してください", current)
	}

	list, err := listMigrations(fsys, dir)
	if err != nil {
		return err
	}
	for _, m := range list {
		if m.version <= current {
			continue
		}
		body, err := fs.ReadFile(fsys, path.Join(dir, m.name))
		if err != nil {
			return fmt.Errorf("read %s: %w", m.name, err)
		}
		if err := setVersion(ctx, db, m.version, true); err != nil {
			return err
		}
		for _, stmt := range splitStatements(string(body)) {
			if _, err := db.ExecContext(ctx, stmt); err != nil {
				return fmt.Errorf("apply %s: %w", m.name, err)
			}
		}
		if err := setVersion(ctx, db, m.version, false); err != nil {
			return err
		}
		log.Printf("migrated: %s", m.name)
	}
	return nil
}

func currentVersion(ctx context.Context, db *sql.DB) (uint64, bool, error) {
	var v uint64
	var dirty bool
	err := db.QueryRowContext(ctx, `SELECT version, dirty FROM schema_migrations LIMIT 1`).Scan(&v, &dirty)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("read schema_migrations: %w", err)
	}
	return v, dirty, nil
}

// setVersion は golang-migrate と同じく、schema_migrations に 1 行だけ残す。
func setVersion(ctx context.Context, db *sql.DB, v uint64, dirty bool) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck // Commit 後の Rollback は何もしない
	if _, err := tx.ExecContext(ctx, `DELETE FROM schema_migrations`); err != nil {
		return fmt.Errorf("clear schema_migrations: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version, dirty) VALUES (?, ?)`, v, dirty); err != nil {
		return fmt.Errorf("write schema_migrations: %w", err)
	}
	return tx.Commit()
}

// listMigrations は「000001_xxx.up.sql」の形のファイルを番号順に並べる。
func listMigrations(fsys fs.FS, dir string) ([]migration, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	var list []migration
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		num, _, ok := strings.Cut(name, "_")
		if !ok {
			return nil, fmt.Errorf("マイグレーションの名前が正しくありません: %s", name)
		}
		v, err := strconv.ParseUint(num, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("マイグレーションの番号が正しくありません: %s", name)
		}
		list = append(list, migration{version: v, name: name})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].version < list[j].version })
	for i := 1; i < len(list); i++ {
		if list[i].version == list[i-1].version {
			return nil, fmt.Errorf("マイグレーションの番号が重複しています: %d", list[i].version)
		}
	}
	return list, nil
}

// splitStatements は SQL を「;」で区切って、空でない文だけを返す（行コメントは取りのぞく）。
// このプロジェクトの SQL は文字列の中に「;」を書かない前提。
func splitStatements(sqlText string) []string {
	var lines []string
	for _, line := range strings.Split(sqlText, "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "--") {
			continue
		}
		lines = append(lines, line)
	}
	var out []string
	for _, s := range strings.Split(strings.Join(lines, "\n"), ";") {
		if t := strings.TrimSpace(s); t != "" {
			out = append(out, t)
		}
	}
	return out
}
