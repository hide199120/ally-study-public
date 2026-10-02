package service

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// MaxFurnitureOffset は家具を初期位置から動かせる最大の距離（床の大きさ 6x6 に合わせる）。
const MaxFurnitureOffset = 6.0

// RoomStore は部屋の保存先（repository.RoomRepository が満たす）。
type RoomStore interface {
	Find(ctx context.Context, userID int64) (*model.Room, error)
	Save(ctx context.Context, userID int64, room *model.Room) error
}

// RoomService はユーザーごとの部屋（模様替え）の処理を行う。
type RoomService struct {
	rooms RoomStore
}

// NewRoomService は RoomService を作る。
func NewRoomService(rooms RoomStore) *RoomService {
	return &RoomService{rooms: rooms}
}

// Get はユーザーの部屋を返す。まだ保存していなければ初期状態を返す。
func (s *RoomService) Get(ctx context.Context, userID int64) (*model.Room, error) {
	room, err := s.rooms.Find(ctx, userID)
	if errors.Is(err, model.ErrNotFound) {
		return model.DefaultRoom(), nil
	}
	if err != nil {
		return nil, fmt.Errorf("find room: %w", err)
	}
	return room, nil
}

// Update はユーザーの部屋を丸ごと置き換えて保存し、保存した部屋を返す。
// 壁紙・住人・家具の種類が正しいか（enum）はハンドラーでチェック済みの前提で、
// ここでは「同じ家具が2回ない」「動かせる範囲内」といった中身のルールを確認する。
func (s *RoomService) Update(ctx context.Context, userID int64, room *model.Room) (*model.Room, error) {
	if err := validateRoom(room); err != nil {
		return nil, err
	}
	// 位置は 0.01 単位で保存する（DBの DECIMAL(4,2) に合わせる）
	normalized := &model.Room{Avatar: room.Avatar, Wallpaper: room.Wallpaper, Furniture: make([]model.FurniturePlacement, len(room.Furniture))}
	for i, f := range room.Furniture {
		f.X = roundOffset(f.X)
		f.Z = roundOffset(f.Z)
		normalized.Furniture[i] = f
	}
	if err := s.rooms.Save(ctx, userID, normalized); err != nil {
		return nil, fmt.Errorf("save room: %w", err)
	}
	return normalized, nil
}

func validateRoom(room *model.Room) error {
	seen := make(map[string]bool, len(room.Furniture))
	for _, f := range room.Furniture {
		if seen[f.ID] {
			return &ValidationError{Message: fmt.Sprintf("家具「%s」が重複しています", f.ID)}
		}
		seen[f.ID] = true
		if !validOffset(f.X) || !validOffset(f.Z) {
			return &ValidationError{Message: "家具の位置が部屋の範囲外です"}
		}
	}
	return nil
}

func validOffset(v float64) bool {
	return !math.IsNaN(v) && math.Abs(v) <= MaxFurnitureOffset
}

func roundOffset(v float64) float64 {
	r := math.Round(v*100) / 100
	if r == 0 {
		return 0 // -0 を 0 にそろえる
	}
	return r
}
