package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// GetMyRoom は GET /api/me/room を処理する。
func (s *Server) GetMyRoom(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	room, err := s.Room.Get(c.Request.Context(), user.ID)
	if err != nil {
		log.Printf("get room: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}
	c.JSON(http.StatusOK, toAPIRoom(room))
}

// UpdateMyRoom は PUT /api/me/room を処理する。
func (s *Server) UpdateMyRoom(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	var req api.UpdateMyRoomJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}
	room, msg := fromAPIRoom(req)
	if msg != "" {
		errorJSON(c, http.StatusBadRequest, "validation_error", msg)
		return
	}

	saved, err := s.Room.Update(c.Request.Context(), user.ID, room)
	if err != nil {
		var ve *service.ValidationError
		if errors.As(err, &ve) {
			errorJSON(c, http.StatusBadRequest, "validation_error", ve.Message)
			return
		}
		log.Printf("update room: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}
	c.JSON(http.StatusOK, toAPIRoom(saved))
}

// fromAPIRoom はリクエストの部屋をアプリ内の形に変換する。
// OpenAPI の enum にない値が来たら、画面に出せるエラーメッセージを返す。
func fromAPIRoom(r api.Room) (*model.Room, string) {
	if !r.Avatar.Valid() {
		return nil, "住人の種類が正しくありません"
	}
	if !r.Wallpaper.Valid() {
		return nil, "壁紙の種類が正しくありません"
	}
	furniture := make([]model.FurniturePlacement, 0, len(r.Furniture))
	for _, f := range r.Furniture {
		if !f.Id.Valid() {
			return nil, "家具の種類が正しくありません"
		}
		furniture = append(furniture, model.FurniturePlacement{ID: string(f.Id), Placed: f.Placed, X: f.X, Z: f.Z})
	}
	return &model.Room{Avatar: string(r.Avatar), Wallpaper: string(r.Wallpaper), Furniture: furniture}, ""
}

// toAPIRoom はアプリ内の部屋を、APIのレスポンス用の形に変換する。
func toAPIRoom(r *model.Room) api.Room {
	furniture := make([]api.FurniturePlacement, 0, len(r.Furniture))
	for _, f := range r.Furniture {
		furniture = append(furniture, api.FurniturePlacement{Id: api.FurnitureId(f.ID), Placed: f.Placed, X: f.X, Z: f.Z})
	}
	return api.Room{Avatar: api.Avatar(r.Avatar), Wallpaper: api.Wallpaper(r.Wallpaper), Furniture: furniture}
}
