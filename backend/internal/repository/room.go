package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// RoomRepository は user_rooms / user_furniture テーブルを扱う。
type RoomRepository struct {
	DB *sql.DB
}

// Find はユーザーの部屋を取得する。まだ保存していなければ model.ErrNotFound を返す。
func (r *RoomRepository) Find(ctx context.Context, userID int64) (*model.Room, error) {
	room := &model.Room{Furniture: []model.FurniturePlacement{}}
	err := r.DB.QueryRowContext(ctx,
		`SELECT avatar, wallpaper FROM user_rooms WHERE user_id = ?`, userID,
	).Scan(&room.Avatar, &room.Wallpaper)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select user_rooms: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx,
		`SELECT furniture_id, placed, offset_x, offset_z FROM user_furniture WHERE user_id = ? ORDER BY furniture_id`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("select user_furniture: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var f model.FurniturePlacement
		if err := rows.Scan(&f.ID, &f.Placed, &f.X, &f.Z); err != nil {
			return nil, fmt.Errorf("scan user_furniture: %w", err)
		}
		room.Furniture = append(room.Furniture, f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user_furniture: %w", err)
	}
	return room, nil
}

// Save はユーザーの部屋を丸ごと置き換えて保存する（1つのトランザクションで行う）。
func (r *RoomRepository) Save(ctx context.Context, userID int64, room *model.Room) (err error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	// 途中で失敗したら全部取り消す
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.ExecContext(ctx,
		`INSERT INTO user_rooms (user_id, avatar, wallpaper) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE avatar = VALUES(avatar), wallpaper = VALUES(wallpaper)`,
		userID, room.Avatar, room.Wallpaper,
	); err != nil {
		return fmt.Errorf("upsert user_rooms: %w", err)
	}

	if _, err = tx.ExecContext(ctx, `DELETE FROM user_furniture WHERE user_id = ?`, userID); err != nil {
		return fmt.Errorf("delete user_furniture: %w", err)
	}

	if len(room.Furniture) > 0 {
		// まとめて1回の INSERT で入れる
		placeholders := make([]string, 0, len(room.Furniture))
		args := make([]any, 0, len(room.Furniture)*5)
		for _, f := range room.Furniture {
			placeholders = append(placeholders, "(?, ?, ?, ?, ?)")
			args = append(args, userID, f.ID, f.Placed, f.X, f.Z)
		}
		query := `INSERT INTO user_furniture (user_id, furniture_id, placed, offset_x, offset_z) VALUES ` + strings.Join(placeholders, ", ")
		if _, err = tx.ExecContext(ctx, query, args...); err != nil {
			return fmt.Errorf("insert user_furniture: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
