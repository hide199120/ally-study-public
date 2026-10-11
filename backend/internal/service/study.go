package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/hide199120/ally-study/backend/internal/model"
)

const (
	// 1回に記録できる勉強時間の上限（12時間）
	maxSessionMinutes = 720
	// 週の目標時間の上限（100時間）
	maxWeeklyGoalMinutes = 6000
	maxGoals             = 30
	maxGoalTitleLen      = 50
	maxGoalIDLen         = 36
	// 日ごとの勉強時間を返す期間。タイムゾーンの差を考えて1日多めに取る
	overviewDays = 61
)

// StudyStore は学習記録の保存先（repository.StudyRepository が満たす）。
type StudyStore interface {
	AddSession(ctx context.Context, userID int64, s model.StudySession) (int, error)
	DailyTotals(ctx context.Context, userID int64, from string) ([]model.StudyDay, error)
	WeeklyGoal(ctx context.Context, userID int64) (int, error)
	SaveWeeklyGoal(ctx context.Context, userID int64, minutes int) error
	Goals(ctx context.Context, userID int64) ([]model.StudyGoal, error)
	SaveGoals(ctx context.Context, userID int64, goals []model.StudyGoal) error
}

// StudyService は学習記録（勉強時間・週の目標・資格やタスクの目標）の処理を行う。
type StudyService struct {
	store StudyStore
	now   func() time.Time
}

// NewStudyService は StudyService を作る。
func NewStudyService(store StudyStore) *StudyService {
	return &StudyService{store: store, now: time.Now}
}

// Overview は週の目標・目標の一覧・直近の日ごとの勉強時間をまとめて返す。
func (s *StudyService) Overview(ctx context.Context, userID int64) (*model.StudyOverview, error) {
	weekly, err := s.store.WeeklyGoal(ctx, userID)
	if errors.Is(err, model.ErrNotFound) {
		weekly = model.DefaultWeeklyGoalMinutes
	} else if err != nil {
		return nil, fmt.Errorf("weekly goal: %w", err)
	}

	goals, err := s.store.Goals(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("goals: %w", err)
	}

	from := s.now().UTC().AddDate(0, 0, -overviewDays).Format(model.DateLayout)
	days, err := s.store.DailyTotals(ctx, userID, from)
	if err != nil {
		return nil, fmt.Errorf("daily totals: %w", err)
	}
	return &model.StudyOverview{WeeklyGoalMinutes: weekly, Goals: goals, Days: days}, nil
}

// AddSession は勉強した時間を記録し、その日の合計を返す。
func (s *StudyService) AddSession(ctx context.Context, userID int64, session model.StudySession) (*model.StudyDay, error) {
	if err := s.validateSessionDate(session.Date); err != nil {
		return nil, err
	}
	if session.Minutes < 1 || session.Minutes > maxSessionMinutes {
		return nil, &ValidationError{Message: "勉強時間は1〜720分で記録してください"}
	}
	total, err := s.store.AddSession(ctx, userID, session)
	if err != nil {
		return nil, fmt.Errorf("add session: %w", err)
	}
	return &model.StudyDay{Date: session.Date, Minutes: total}, nil
}

// validateSessionDate は、記録する日付が正しい形式で、ありえる範囲（1年前〜明日）かを確認する。
// ブラウザのタイムゾーンの日付が送られてくるので、サーバーの今日と1日ずれることは許す。
func (s *StudyService) validateSessionDate(date string) error {
	d, err := time.Parse(model.DateLayout, date)
	if err != nil {
		return &ValidationError{Message: "日付の形式が正しくありません"}
	}
	today := s.now().UTC().Truncate(24 * time.Hour)
	if d.After(today.AddDate(0, 0, 1)) || d.Before(today.AddDate(-1, 0, 0)) {
		return &ValidationError{Message: "記録できる日付の範囲外です"}
	}
	return nil
}

// UpdateWeeklyGoal は週の目標時間を保存する。
func (s *StudyService) UpdateWeeklyGoal(ctx context.Context, userID int64, minutes int) error {
	if minutes < 0 || minutes > maxWeeklyGoalMinutes {
		return &ValidationError{Message: "週の目標は0〜100時間で設定してください"}
	}
	if err := s.store.SaveWeeklyGoal(ctx, userID, minutes); err != nil {
		return fmt.Errorf("save weekly goal: %w", err)
	}
	return nil
}

// UpdateGoals は目標の一覧を丸ごと置き換えて保存し、保存した一覧を返す。
// 種類（certification / task）が正しいかはハンドラーで確認済みの前提。
func (s *StudyService) UpdateGoals(ctx context.Context, userID int64, goals []model.StudyGoal) ([]model.StudyGoal, error) {
	if len(goals) > maxGoals {
		return nil, &ValidationError{Message: fmt.Sprintf("目標は%d個までです", maxGoals)}
	}
	seen := make(map[string]bool, len(goals))
	normalized := make([]model.StudyGoal, 0, len(goals))
	for _, g := range goals {
		if g.ID == "" || len(g.ID) > maxGoalIDLen || seen[g.ID] {
			return nil, &ValidationError{Message: "目標のIDが正しくありません"}
		}
		seen[g.ID] = true

		g.Title = strings.TrimSpace(g.Title)
		if n := utf8.RuneCountInString(g.Title); n == 0 || n > maxGoalTitleLen {
			return nil, &ValidationError{Message: "目標の名前は1〜50文字で入力してください"}
		}
		if g.DueDate != nil {
			if _, err := time.Parse(model.DateLayout, *g.DueDate); err != nil {
				return nil, &ValidationError{Message: "期限の日付の形式が正しくありません"}
			}
		}
		normalized = append(normalized, g)
	}
	if err := s.store.SaveGoals(ctx, userID, normalized); err != nil {
		return nil, fmt.Errorf("save goals: %w", err)
	}
	return normalized, nil
}
