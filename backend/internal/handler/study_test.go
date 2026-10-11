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

// fakeStudyService は決まった結果を返す、テスト用の StudyService。
type fakeStudyService struct {
	overview *model.StudyOverview
	err      error

	gotUserID  int64
	gotSession *model.StudySession
	gotWeekly  *int
	gotGoals   []model.StudyGoal
}

func (f *fakeStudyService) Overview(_ context.Context, userID int64) (*model.StudyOverview, error) {
	f.gotUserID = userID
	return f.overview, f.err
}

func (f *fakeStudyService) AddSession(_ context.Context, userID int64, s model.StudySession) (*model.StudyDay, error) {
	f.gotUserID = userID
	f.gotSession = &s
	if f.err != nil {
		return nil, f.err
	}
	return &model.StudyDay{Date: s.Date, Minutes: s.Minutes + 30}, nil
}

func (f *fakeStudyService) UpdateWeeklyGoal(_ context.Context, userID int64, minutes int) error {
	f.gotUserID = userID
	f.gotWeekly = &minutes
	return f.err
}

func (f *fakeStudyService) UpdateGoals(_ context.Context, userID int64, goals []model.StudyGoal) ([]model.StudyGoal, error) {
	f.gotUserID = userID
	f.gotGoals = goals
	if f.err != nil {
		return nil, f.err
	}
	return goals, nil
}

func studyServer(study *fakeStudyService) *Server {
	return &Server{Auth: &fakeAuthService{user: testUser, validToken: "valid-token"}, Study: study}
}

// sendJSON はセッションCookieを付けて、JSONを送る。
func sendJSON(s *Server, method, path, sessionToken, body string) *httptest.ResponseRecorder {
	r := newTestRouter(s)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if sessionToken != "" {
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sessionToken})
	}
	r.ServeHTTP(w, req)
	return w
}

func errorCode(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var e api.Error
	if err := json.Unmarshal(w.Body.Bytes(), &e); err != nil {
		t.Fatalf("エラーのJSONとして読めない: %s", w.Body.String())
	}
	return e.Code
}

func TestServer_GetMyStudy(t *testing.T) {
	due := "2026-12-20"
	study := &fakeStudyService{overview: &model.StudyOverview{
		WeeklyGoalMinutes: 600,
		Goals:             []model.StudyGoal{{ID: "a", Kind: "certification", Title: "AWS DOP", DueDate: &due}},
		Days:              []model.StudyDay{{Date: "2026-10-12", Minutes: 75}},
	}}
	w := doRequest(studyServer(study), http.MethodGet, "/api/me/study", "valid-token")

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	var got api.StudyOverview
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	want := api.StudyOverview{
		WeeklyGoalMinutes: 600,
		Goals:             []api.StudyGoal{{Id: "a", Kind: api.GoalKindCertification, Title: "AWS DOP", DueDate: &due}},
		Days:              []api.StudyDay{{Date: "2026-10-12", Minutes: 75}},
	}
	if !reflect.DeepEqual(got, want) || study.gotUserID != testUser.ID {
		t.Fatalf("got %+v (user %d)", got, study.gotUserID)
	}

	t.Run("期限のない目標は dueDate を返さない", func(t *testing.T) {
		study := &fakeStudyService{overview: &model.StudyOverview{Goals: []model.StudyGoal{{ID: "b", Kind: "task", Title: "x"}}, Days: []model.StudyDay{}}}
		w := doRequest(studyServer(study), http.MethodGet, "/api/me/study", "valid-token")
		if strings.Contains(w.Body.String(), "dueDate") {
			t.Fatalf("body = %s", w.Body.String())
		}
	})

	t.Run("ログインしていなければ401", func(t *testing.T) {
		w := doRequest(studyServer(&fakeStudyService{}), http.MethodGet, "/api/me/study", "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d", w.Code)
		}
	})

	t.Run("想定外のエラーなら500", func(t *testing.T) {
		w := doRequest(studyServer(&fakeStudyService{err: errors.New("db down")}), http.MethodGet, "/api/me/study", "valid-token")
		if w.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d", w.Code)
		}
	})
}

func TestServer_AddStudySession(t *testing.T) {
	t.Run("記録して、その日の合計を201で返す", func(t *testing.T) {
		study := &fakeStudyService{}
		w := sendJSON(studyServer(study), http.MethodPost, "/api/me/study/sessions", "valid-token", `{"date":"2026-10-12","minutes":25,"mode":"pomodoro"}`)
		if w.Code != http.StatusCreated {
			t.Fatalf("status = %d (body: %s)", w.Code, w.Body.String())
		}
		if !reflect.DeepEqual(study.gotSession, &model.StudySession{Date: "2026-10-12", Minutes: 25, Mode: "pomodoro"}) {
			t.Fatalf("session = %+v", study.gotSession)
		}
		var got api.StudyDay
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Minutes != 55 {
			t.Fatalf("body = %s", w.Body.String())
		}
	})

	tests := []struct {
		name     string
		body     string
		err      error
		wantCode int
	}{
		{"JSONが壊れている", `{"date":`, nil, http.StatusBadRequest},
		{"タイマーの種類が不正", `{"date":"2026-10-12","minutes":25,"mode":"egg"}`, nil, http.StatusBadRequest},
		{"サービスでのバリデーションエラー", `{"date":"2026-10-12","minutes":0,"mode":"stopwatch"}`, &service.ValidationError{Message: "NG"}, http.StatusBadRequest},
		{"想定外のエラー", `{"date":"2026-10-12","minutes":25,"mode":"stopwatch"}`, errors.New("db down"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			study := &fakeStudyService{err: tt.err}
			w := sendJSON(studyServer(study), http.MethodPost, "/api/me/study/sessions", "valid-token", tt.body)
			if w.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantCode)
			}
			if tt.err == nil && study.gotSession != nil {
				t.Fatal("不正なリクエストなのにサービスが呼ばれた")
			}
		})
	}

	t.Run("ログインしていなければ401", func(t *testing.T) {
		w := sendJSON(studyServer(&fakeStudyService{}), http.MethodPost, "/api/me/study/sessions", "", `{"date":"2026-10-12","minutes":25,"mode":"pomodoro"}`)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d", w.Code)
		}
	})
}

func TestServer_UpdateStudySettings(t *testing.T) {
	study := &fakeStudyService{}
	w := sendJSON(studyServer(study), http.MethodPut, "/api/me/study/settings", "valid-token", `{"weeklyGoalMinutes":900}`)
	if w.Code != http.StatusOK || study.gotWeekly == nil || *study.gotWeekly != 900 {
		t.Fatalf("status = %d, weekly = %v", w.Code, study.gotWeekly)
	}

	w = sendJSON(studyServer(&fakeStudyService{err: &service.ValidationError{Message: "NG"}}), http.MethodPut, "/api/me/study/settings", "valid-token", `{"weeklyGoalMinutes":-1}`)
	if w.Code != http.StatusBadRequest || errorCode(t, w) != "validation_error" {
		t.Fatalf("status = %d", w.Code)
	}
}

func TestServer_UpdateStudyGoals(t *testing.T) {
	t.Run("保存して、保存後の一覧を返す", func(t *testing.T) {
		study := &fakeStudyService{}
		body := `{"goals":[{"id":"a","kind":"certification","title":"AWS DOP","dueDate":"2026-12-20","done":false},{"id":"b","kind":"task","title":"記事","done":true}]}`
		w := sendJSON(studyServer(study), http.MethodPut, "/api/me/study/goals", "valid-token", body)
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d (body: %s)", w.Code, w.Body.String())
		}
		if len(study.gotGoals) != 2 || study.gotGoals[0].DueDate == nil || *study.gotGoals[0].DueDate != "2026-12-20" || study.gotGoals[1].DueDate != nil {
			t.Fatalf("goals = %+v", study.gotGoals)
		}
	})

	t.Run("目標の種類が不正なら400で、保存しない", func(t *testing.T) {
		study := &fakeStudyService{}
		w := sendJSON(studyServer(study), http.MethodPut, "/api/me/study/goals", "valid-token", `{"goals":[{"id":"a","kind":"dream","title":"x","done":false}]}`)
		if w.Code != http.StatusBadRequest || study.gotGoals != nil {
			t.Fatalf("status = %d", w.Code)
		}
	})

	t.Run("想定外のエラーなら500", func(t *testing.T) {
		w := sendJSON(studyServer(&fakeStudyService{err: errors.New("db down")}), http.MethodPut, "/api/me/study/goals", "valid-token", `{"goals":[]}`)
		if w.Code != http.StatusInternalServerError || errorCode(t, w) != "internal_error" {
			t.Fatalf("status = %d", w.Code)
		}
	})
}
