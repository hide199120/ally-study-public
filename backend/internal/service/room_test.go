package service

import (
	"context"
	"errors"
	"math"
	"reflect"
	"testing"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// fakeRoomStore はメモリ上で部屋を保存する、テスト用の RoomStore。
type fakeRoomStore struct {
	rooms   map[int64]*model.Room
	findErr error
	saveErr error
	saved   int // Save が呼ばれた回数
}

func newFakeRoomStore() *fakeRoomStore { return &fakeRoomStore{rooms: map[int64]*model.Room{}} }

func (f *fakeRoomStore) Find(_ context.Context, userID int64) (*model.Room, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	r, ok := f.rooms[userID]
	if !ok {
		return nil, model.ErrNotFound
	}
	return r, nil
}

func (f *fakeRoomStore) Save(_ context.Context, userID int64, room *model.Room) error {
	f.saved++
	if f.saveErr != nil {
		return f.saveErr
	}
	f.rooms[userID] = room
	return nil
}

func TestRoomService_Get_Default(t *testing.T) {
	s := NewRoomService(newFakeRoomStore())

	got, err := s.Get(context.Background(), 1)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	want := &model.Room{Avatar: "girl", Wallpaper: "meadow", Furniture: []model.FurniturePlacement{}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Get() = %+v, want %+v", got, want)
	}
}

func TestRoomService_UpdateThenGet(t *testing.T) {
	store := newFakeRoomStore()
	s := NewRoomService(store)
	ctx := context.Background()

	in := &model.Room{
		Avatar:    "boy",
		Wallpaper: "night",
		Furniture: []model.FurniturePlacement{
			{ID: "bed", Placed: true, X: -0.504, Z: 0.296},
			{ID: "beanbag", Placed: false, X: 0, Z: 0},
			{ID: "rug", Placed: true, X: -0.001, Z: 0},
		},
	}
	saved, err := s.Update(ctx, 1, in)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	// 位置は 0.01 単位に丸められ、-0 は 0 になる
	want := []model.FurniturePlacement{
		{ID: "bed", Placed: true, X: -0.5, Z: 0.3},
		{ID: "beanbag", Placed: false, X: 0, Z: 0},
		{ID: "rug", Placed: true, X: 0, Z: 0},
	}
	if !reflect.DeepEqual(saved.Furniture, want) {
		t.Errorf("saved furniture = %+v, want %+v", saved.Furniture, want)
	}
	if math.Signbit(saved.Furniture[2].X) {
		t.Errorf("X = -0, want 0")
	}

	got, err := s.Get(ctx, 1)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got.Avatar != "boy" || got.Wallpaper != "night" || !reflect.DeepEqual(got.Furniture, want) {
		t.Errorf("Get() = %+v", got)
	}

	// 別のユーザーの部屋は初期状態のまま
	other, _ := s.Get(ctx, 2)
	if other.Avatar != "girl" || len(other.Furniture) != 0 {
		t.Errorf("other user's room = %+v, want default", other)
	}
}

func TestRoomService_Update_Validation(t *testing.T) {
	tests := []struct {
		name      string
		furniture []model.FurniturePlacement
	}{
		{"同じ家具が2回ある", []model.FurniturePlacement{{ID: "bed", Placed: true}, {ID: "bed", Placed: false}}},
		{"x が範囲外", []model.FurniturePlacement{{ID: "desk", Placed: true, X: 6.01}}},
		{"z が範囲外", []model.FurniturePlacement{{ID: "desk", Placed: true, Z: -7}}},
		{"NaN", []model.FurniturePlacement{{ID: "desk", Placed: true, X: math.NaN()}}},
		{"Inf", []model.FurniturePlacement{{ID: "desk", Placed: true, Z: math.Inf(1)}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newFakeRoomStore()
			s := NewRoomService(store)

			_, err := s.Update(context.Background(), 1, &model.Room{Avatar: "girl", Wallpaper: "meadow", Furniture: tt.furniture})

			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("Update() error = %v, want ValidationError", err)
			}
			if store.saved != 0 {
				t.Errorf("Save was called %d times, want 0", store.saved)
			}
		})
	}
}

func TestRoomService_StoreErrors(t *testing.T) {
	boom := errors.New("db down")

	store := newFakeRoomStore()
	store.findErr = boom
	if _, err := NewRoomService(store).Get(context.Background(), 1); !errors.Is(err, boom) {
		t.Errorf("Get() error = %v, want %v", err, boom)
	}

	store = newFakeRoomStore()
	store.saveErr = boom
	if _, err := NewRoomService(store).Update(context.Background(), 1, model.DefaultRoom()); !errors.Is(err, boom) {
		t.Errorf("Update() error = %v, want %v", err, boom)
	}
}
