package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// fakeRoomService は決まった結果を返す、テスト用の RoomService。
type fakeRoomService struct {
	room *model.Room
	err  error

	gotUserID int64       // 呼ばれたときのユーザーID
	updated   *model.Room // Update に渡された部屋
}

func (f *fakeRoomService) Get(_ context.Context, userID int64) (*model.Room, error) {
	f.gotUserID = userID
	return f.room, f.err
}

func (f *fakeRoomService) Update(_ context.Context, userID int64, room *model.Room) (*model.Room, error) {
	f.gotUserID = userID
	f.updated = room
	if f.err != nil {
		return nil, f.err
	}
	return room, nil
}

func loggedInServer(room *fakeRoomService) *Server {
	return &Server{Auth: &fakeAuthService{user: testUser, validToken: "valid-token"}, Room: room}
}

// putJSON はセッションCookieを付けて、JSONを PUT する。
func putJSON(s *Server, path, sessionToken, body string) *httptest.ResponseRecorder {
	r := newTestRouter(s)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if sessionToken != "" {
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sessionToken})
	}
	r.ServeHTTP(w, req)
	return w
}

func TestServer_GetMyRoom(t *testing.T) {
	t.Run("ログイン中ならそのユーザーの部屋を返す", func(t *testing.T) {
		rooms := &fakeRoomService{room: &model.Room{
			Avatar:    "boy",
			Wallpaper: "night",
			Furniture: []model.FurniturePlacement{{ID: "bed", Placed: false}, {ID: "beanbag", Placed: true, X: 0.5, Z: -0.25}},
		}}
		w := doRequest(loggedInServer(rooms), http.MethodGet, "/api/me/room", "valid-token")

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d (body: %s)", w.Code, http.StatusOK, w.Body.String())
		}
		if rooms.gotUserID != testUser.ID {
			t.Fatalf("userID = %d, want %d", rooms.gotUserID, testUser.ID)
		}
		var got api.Room
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
			t.Fatalf("レスポンスがJSONとして読めない: %v", err)
		}
		want := api.Room{
			Avatar:    api.AvatarBoy,
			Wallpaper: api.WallpaperNight,
			Furniture: []api.FurniturePlacement{
				{Id: api.FurnitureIdBed, Placed: false},
				{Id: api.FurnitureIdBeanbag, Placed: true, X: 0.5, Z: -0.25},
			},
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("room = %+v, want %+v", got, want)
		}
	})

	t.Run("家具を保存していなくても furniture は空の配列で返す", func(t *testing.T) {
		w := doRequest(loggedInServer(&fakeRoomService{room: model.DefaultRoom()}), http.MethodGet, "/api/me/room", "valid-token")
		if !strings.Contains(w.Body.String(), `"furniture":[]`) {
			t.Fatalf("body = %s", w.Body.String())
		}
	})

	t.Run("ログインしていなければ401", func(t *testing.T) {
		w := doRequest(loggedInServer(&fakeRoomService{}), http.MethodGet, "/api/me/room", "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
	})

	t.Run("想定外のエラーなら500", func(t *testing.T) {
		w := doRequest(loggedInServer(&fakeRoomService{err: errors.New("db down")}), http.MethodGet, "/api/me/room", "valid-token")
		if w.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusInternalServerError)
		}
	})
}

func TestServer_UpdateMyRoom(t *testing.T) {
	const validBody = `{"avatar":"boy","wallpaper":"dots","furniture":[{"id":"bed","placed":true,"x":-0.5,"z":0.3},{"id":"guitar","placed":false,"x":0,"z":0}]}`

	t.Run("保存して、保存後の部屋を返す", func(t *testing.T) {
		rooms := &fakeRoomService{}
		w := putJSON(loggedInServer(rooms), "/api/me/room", "valid-token", validBody)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d (body: %s)", w.Code, http.StatusOK, w.Body.String())
		}
		want := &model.Room{
			Avatar:    "boy",
			Wallpaper: "dots",
			Furniture: []model.FurniturePlacement{{ID: "bed", Placed: true, X: -0.5, Z: 0.3}, {ID: "guitar", Placed: false}},
		}
		if rooms.gotUserID != testUser.ID || !reflect.DeepEqual(rooms.updated, want) {
			t.Fatalf("Update(%d, %+v)", rooms.gotUserID, rooms.updated)
		}
		var got api.Room
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Wallpaper != api.WallpaperDots {
			t.Fatalf("body = %s", w.Body.String())
		}
	})

	tests := []struct {
		name     string
		body     string
		roomErr  error
		wantCode int
		wantErr  string
	}{
		{name: "JSONが壊れている", body: `{"avatar":`, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "住人の種類が不正", body: `{"avatar":"robot","wallpaper":"meadow","furniture":[]}`, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "壁紙の種類が不正", body: `{"avatar":"girl","wallpaper":"gold","furniture":[]}`, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "家具の種類が不正", body: `{"avatar":"girl","wallpaper":"meadow","furniture":[{"id":"piano","placed":true,"x":0,"z":0}]}`, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "サービスでのバリデーションエラー", body: validBody, roomErr: &service.ValidationError{Message: "NG"}, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "想定外のエラー", body: validBody, roomErr: errors.New("db down"), wantCode: http.StatusInternalServerError, wantErr: "internal_error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rooms := &fakeRoomService{err: tt.roomErr}
			w := putJSON(loggedInServer(rooms), "/api/me/room", "valid-token", tt.body)

			if w.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantCode)
			}
			var got api.Error
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Code != tt.wantErr {
				t.Fatalf("body = %s, want code %s", w.Body.String(), tt.wantErr)
			}
			// 不正なリクエストはサービスまで届かない
			if tt.roomErr == nil && rooms.updated != nil {
				t.Fatal("不正なリクエストなのに Update が呼ばれている")
			}
		})
	}

	t.Run("ログインしていなければ401で、保存しない", func(t *testing.T) {
		rooms := &fakeRoomService{}
		w := putJSON(loggedInServer(rooms), "/api/me/room", "", validBody)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
		if rooms.updated != nil {
			t.Fatal("ログインしていないのに Update が呼ばれている")
		}
	})
}
