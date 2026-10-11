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

// GetMyStudy は GET /api/me/study を処理する。
func (s *Server) GetMyStudy(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	overview, err := s.Study.Overview(c.Request.Context(), user.ID)
	if err != nil {
		log.Printf("get study: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}

	days := make([]api.StudyDay, 0, len(overview.Days))
	for _, d := range overview.Days {
		days = append(days, api.StudyDay{Date: d.Date, Minutes: d.Minutes})
	}
	c.JSON(http.StatusOK, api.StudyOverview{
		WeeklyGoalMinutes: overview.WeeklyGoalMinutes,
		Goals:             toAPIGoals(overview.Goals),
		Days:              days,
	})
}

// AddStudySession は POST /api/me/study/sessions を処理する。
func (s *Server) AddStudySession(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	var req api.AddStudySessionJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}
	if !req.Mode.Valid() {
		errorJSON(c, http.StatusBadRequest, "validation_error", "タイマーの種類が正しくありません")
		return
	}

	day, err := s.Study.AddSession(c.Request.Context(), user.ID, model.StudySession{Date: req.Date, Minutes: req.Minutes, Mode: string(req.Mode)})
	if s.handleStudyError(c, "add study session", err) {
		return
	}
	c.JSON(http.StatusCreated, api.StudyDay{Date: day.Date, Minutes: day.Minutes})
}

// UpdateStudySettings は PUT /api/me/study/settings を処理する。
func (s *Server) UpdateStudySettings(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	var req api.UpdateStudySettingsJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}

	err := s.Study.UpdateWeeklyGoal(c.Request.Context(), user.ID, req.WeeklyGoalMinutes)
	if s.handleStudyError(c, "update study settings", err) {
		return
	}
	c.JSON(http.StatusOK, api.StudySettings{WeeklyGoalMinutes: req.WeeklyGoalMinutes})
}

// UpdateStudyGoals は PUT /api/me/study/goals を処理する。
func (s *Server) UpdateStudyGoals(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}

	var req api.UpdateStudyGoalsJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}
	goals := make([]model.StudyGoal, 0, len(req.Goals))
	for _, g := range req.Goals {
		if !g.Kind.Valid() {
			errorJSON(c, http.StatusBadRequest, "validation_error", "目標の種類が正しくありません")
			return
		}
		goals = append(goals, model.StudyGoal{ID: g.Id, Kind: string(g.Kind), Title: g.Title, DueDate: g.DueDate, Done: g.Done})
	}

	saved, err := s.Study.UpdateGoals(c.Request.Context(), user.ID, goals)
	if s.handleStudyError(c, "update study goals", err) {
		return
	}
	c.JSON(http.StatusOK, api.StudyGoals{Goals: toAPIGoals(saved)})
}

// handleStudyError はエラーがあればレスポンスを返して true を返す。
// 入力内容のエラーは 400、それ以外は 500 にする。
func (s *Server) handleStudyError(c *gin.Context, op string, err error) bool {
	if err == nil {
		return false
	}
	var ve *service.ValidationError
	if errors.As(err, &ve) {
		errorJSON(c, http.StatusBadRequest, "validation_error", ve.Message)
		return true
	}
	log.Printf("%s: %v", op, err)
	errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
	return true
}

func toAPIGoals(goals []model.StudyGoal) []api.StudyGoal {
	out := make([]api.StudyGoal, 0, len(goals))
	for _, g := range goals {
		out = append(out, api.StudyGoal{Id: g.ID, Kind: api.GoalKind(g.Kind), Title: g.Title, DueDate: g.DueDate, Done: g.Done})
	}
	return out
}
