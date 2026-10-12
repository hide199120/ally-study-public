// Package repository はDBへの読み書きを担当する層。
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/go-sql-driver/mysql"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// mysqlErrDuplicateEntry は UNIQUE 制約違反のエラー番号。
const mysqlErrDuplicateEntry = 1062

// UserRepository は users テーブルを扱う。
type UserRepository struct {
	DB *sql.DB
}

// Create はユーザーを作成する。ユーザー名が重複していたら model.ErrUsernameTaken を返す。
func (r *UserRepository) Create(ctx context.Context, username, passwordHash string) (*model.User, error) {
	res, err := r.DB.ExecContext(ctx,
		`INSERT INTO users (username, password_hash) VALUES (?, ?)`,
		username, passwordHash,
	)
	if err != nil {
		var me *mysql.MySQLError
		if errors.As(err, &me) && me.Number == mysqlErrDuplicateEntry {
			return nil, model.ErrUsernameTaken
		}
		return nil, fmt.Errorf("insert user: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get inserted user id: %w", err)
	}
	return r.FindByID(ctx, id)
}

// FindByID はIDでユーザーを取得する。見つからなければ model.ErrNotFound を返す。
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*model.User, error) {
	var u model.User
	err := r.DB.QueryRowContext(ctx,
		`SELECT id, username, password_hash, created_at FROM users WHERE id = ?`, id,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select user: %w", err)
	}
	return &u, nil
}

// FindByUsername はユーザー名でユーザーを取得する。見つからなければ model.ErrNotFound を返す。
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	var u model.User
	err := r.DB.QueryRowContext(ctx,
		`SELECT id, username, password_hash, created_at FROM users WHERE username = ?`, username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select user by username: %w", err)
	}
	return &u, nil
}

// Delete はユーザーを削除する。部屋・学習記録・セッションは外部キーの ON DELETE CASCADE で一緒に消える。
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	if _, err := r.DB.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}
