package service

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// fakeStudyStore はメモリ上で学習記録を保存する、テスト用の StudyStore。
type fakeStudyStore struct {
	sessions map[int64][]model.StudySession
	weekly   map[int64]int
	goals    map[int64][]model.StudyGoal
	err      error
	gotFrom  string // DailyTotals に渡された from
	saves    int    // 保存系が呼ばれた回数
}

func newFakeStudyStore() *fakeStudyStore {
	return &fakeStudyStore{sessions: map[int64][]model.StudySession{}, weekly: map[int64]int{}, goals: map[int64][]model.StudyGoal{}}
}

func (f *fakeStudyStore) AddSession(_ context.Context, userID int64, s model.StudySession) (int, error) {
	f.saves++
	if f.err != nil {
		return 0, f.err
	}
	f.sessions[userID] = append(f.sessions[userID], s)
	total := 0
	for _, x := range f.sessions[userID] {
		if x.Date == s.Date {
			total += x.Minutes
		}
	}
	return total, nil
}

func (f *fakeStudyStore) DayStats(_ context.Context, userID int64, date string) (int, int, error) {
	if f.err != nil {
		return 0, 0, f.err
	}
	minutes, count := 0, 0
	for _, x := range f.sessions[userID] {
		if x.Date == date {
			minutes += x.Minutes
			count++
		}
	}
	return minutes, count, nil
}

func (f *fakeStudyStore) DailyTotals(_ context.Context, userID int64, from string) ([]model.StudyDay, error) {
	f.gotFrom = from
	if f.err != nil {
		return nil, f.err
	}
	totals := map[string]int{}
	order := []string{}
	for _, s := range f.sessions[userID] {
		if s.Date < from {
			continue
		}
		if _, ok := totals[s.Date]; !ok {
			order = append(order, s.Date)
		}
		totals[s.Date] += s.Minutes
	}
	days := []model.StudyDay{}
	for _, d := range order {
		days = append(days, model.StudyDay{Date: d, Minutes: totals[d]})
	}
	return days, nil
}

func (f *fakeStudyStore) WeeklyGoal(_ context.Context, userID int64) (int, error) {
	if f.err != nil {
		return 0, f.err
	}
	m, ok := f.weekly[userID]
	if !ok {
		return 0, model.ErrNotFound
	}
	return m, nil
}

func (f *fakeStudyStore) SaveWeeklyGoal(_ context.Context, userID int64, minutes int) error {
	f.saves++
	if f.err != nil {
		return f.err
	}
	f.weekly[userID] = minutes
	return nil
}

func (f *fakeStudyStore) Goals(_ context.Context, userID int64) ([]model.StudyGoal, error) {
	if f.err != nil {
		return nil, f.err
	}
	if g, ok := f.goals[userID]; ok {
		return g, nil
	}
	return []model.StudyGoal{}, nil
}

func (f *fakeStudyStore) SaveGoals(_ context.Context, userID int64, goals []model.StudyGoal) error {
	f.saves++
	if f.err != nil {
		return f.err
	}
	f.goals[userID] = goals
	return nil
}

// 2026-10-12 12:00 UTC を「今」とするサービス
func newTestStudyService(store StudyStore) *StudyService {
	s := NewStudyService(store)
	s.now = func() time.Time { return time.Date(2026, 10, 12, 12, 0, 0, 0, time.UTC) }
	return s
}

func strPtr(s string) *string { return &s }

func TestStudyService_Overview_Default(t *testing.T) {
	store := newFakeStudyStore()
	got, err := newTestStudyService(store).Overview(context.Background(), 1)
	if err != nil {
		t.Fatalf("Overview() error = %v", err)
	}
	want := &model.StudyOverview{WeeklyGoalMinutes: 600, Goals: []model.StudyGoal{}, Days: []model.StudyDay{}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Overview() = %+v, want %+v", got, want)
	}
	// 直近61日ぶんを取りに行く
	if store.gotFrom != "2026-08-12" {
		t.Errorf("from = %s, want 2026-08-12", store.gotFrom)
	}
}

func TestStudyService_AddSessionThenOverview(t *testing.T) {
	store := newFakeStudyStore()
	s := newTestStudyService(store)
	ctx := context.Background()

	if _, err := s.AddSession(ctx, 1, model.StudySession{Date: "2026-10-11", Minutes: 50, Mode: "pomodoro"}); err != nil {
		t.Fatalf("AddSession() error = %v", err)
	}
	if _, err := s.AddSession(ctx, 1, model.StudySession{Date: "2026-10-12", Minutes: 25, Mode: "pomodoro"}); err != nil {
		t.Fatalf("AddSession() error = %v", err)
	}
	day, err := s.AddSession(ctx, 1, model.StudySession{Date: "2026-10-12", Minutes: 40, Mode: "stopwatch"})
	if err != nil {
		t.Fatalf("AddSession() error = %v", err)
	}
	if day.Date != "2026-10-12" || day.Minutes != 65 {
		t.Errorf("day = %+v, want 2026-10-12 / 65", day)
	}

	got, _ := s.Overview(ctx, 1)
	want := []model.StudyDay{{Date: "2026-10-11", Minutes: 50}, {Date: "2026-10-12", Minutes: 65}}
	if !reflect.DeepEqual(got.Days, want) {
		t.Errorf("Days = %+v, want %+v", got.Days, want)
	}
}

func TestStudyService_AddSession_Validation(t *testing.T) {
	tests := []struct {
		name    string
		session model.StudySession
	}{
		{"日付の形式が違う", model.StudySession{Date: "2026/10/12", Minutes: 25}},
		{"存在しない日付", model.StudySession{Date: "2026-02-30", Minutes: 25}},
		{"2日以上先の日付", model.StudySession{Date: "2026-10-14", Minutes: 25}},
		{"1年より前の日付", model.StudySession{Date: "2025-10-11", Minutes: 25}},
		{"0分", model.StudySession{Date: "2026-10-12", Minutes: 0}},
		{"12時間を超える", model.StudySession{Date: "2026-10-12", Minutes: 721}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newFakeStudyStore()
			_, err := newTestStudyService(store).AddSession(context.Background(), 1, tt.session)
			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("error = %v, want ValidationError", err)
			}
			if store.saves != 0 {
				t.Error("不正な入力なのに保存された")
			}
		})
	}

	t.Run("タイムゾーンの差で明日の日付になっても記録できる", func(t *testing.T) {
		if _, err := newTestStudyService(newFakeStudyStore()).AddSession(context.Background(), 1, model.StudySession{Date: "2026-10-13", Minutes: 25}); err != nil {
			t.Fatalf("error = %v", err)
		}
	})
}

func TestStudyService_UpdateWeeklyGoal(t *testing.T) {
	store := newFakeStudyStore()
	s := newTestStudyService(store)
	if err := s.UpdateWeeklyGoal(context.Background(), 1, 900); err != nil {
		t.Fatalf("UpdateWeeklyGoal() error = %v", err)
	}
	got, _ := s.Overview(context.Background(), 1)
	if got.WeeklyGoalMinutes != 900 {
		t.Errorf("WeeklyGoalMinutes = %d, want 900", got.WeeklyGoalMinutes)
	}

	for _, m := range []int{-1, 6001} {
		var ve *ValidationError
		if err := s.UpdateWeeklyGoal(context.Background(), 1, m); !errors.As(err, &ve) {
			t.Errorf("UpdateWeeklyGoal(%d) error = %v, want ValidationError", m, err)
		}
	}
}

func TestStudyService_UpdateGoals(t *testing.T) {
	store := newFakeStudyStore()
	s := newTestStudyService(store)
	in := []model.StudyGoal{
		{ID: "a", Kind: "certification", Title: "  AWS DOP  ", DueDate: strPtr("2026-12-20")},
		{ID: "b", Kind: "task", Title: "記事を書く", Done: true},
	}
	saved, err := s.UpdateGoals(context.Background(), 1, in)
	if err != nil {
		t.Fatalf("UpdateGoals() error = %v", err)
	}
	if saved[0].Title != "AWS DOP" {
		t.Errorf("前後の空白が消えていない: %q", saved[0].Title)
	}
	got, _ := s.Overview(context.Background(), 1)
	if len(got.Goals) != 2 || got.Goals[1].ID != "b" || !got.Goals[1].Done {
		t.Errorf("Goals = %+v", got.Goals)
	}
}

func TestStudyService_UpdateGoals_Validation(t *testing.T) {
	many := make([]model.StudyGoal, 31)
	for i := range many {
		many[i] = model.StudyGoal{ID: string(rune('a' + i)), Kind: "task", Title: "x"}
	}
	tests := []struct {
		name  string
		goals []model.StudyGoal
	}{
		{"31個以上", many},
		{"IDが空", []model.StudyGoal{{ID: "", Kind: "task", Title: "x"}}},
		{"IDが重複", []model.StudyGoal{{ID: "a", Kind: "task", Title: "x"}, {ID: "a", Kind: "task", Title: "y"}}},
		{"名前が空白だけ", []model.StudyGoal{{ID: "a", Kind: "task", Title: "   "}}},
		{"名前が51文字", []model.StudyGoal{{ID: "a", Kind: "task", Title: strings.Repeat("あ", 51)}}},
		{"期限の形式が違う", []model.StudyGoal{{ID: "a", Kind: "task", Title: "x", DueDate: strPtr("12/20")}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newFakeStudyStore()
			_, err := newTestStudyService(store).UpdateGoals(context.Background(), 1, tt.goals)
			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("error = %v, want ValidationError", err)
			}
			if store.saves != 0 {
				t.Error("不正な入力なのに保存された")
			}
		})
	}
}

func TestStudyService_StoreErrors(t *testing.T) {
	boom := errors.New("db down")
	store := newFakeStudyStore()
	store.err = boom
	s := newTestStudyService(store)
	ctx := context.Background()

	if _, err := s.Overview(ctx, 1); !errors.Is(err, boom) {
		t.Errorf("Overview() error = %v", err)
	}
	if _, err := s.AddSession(ctx, 1, model.StudySession{Date: "2026-10-12", Minutes: 25}); !errors.Is(err, boom) {
		t.Errorf("AddSession() error = %v", err)
	}
	if err := s.UpdateWeeklyGoal(ctx, 1, 600); !errors.Is(err, boom) {
		t.Errorf("UpdateWeeklyGoal() error = %v", err)
	}
	if _, err := s.UpdateGoals(ctx, 1, nil); !errors.Is(err, boom) {
		t.Errorf("UpdateGoals() error = %v", err)
	}
}

func TestStudyService_AddSession_DailyCap(t *testing.T) {
	store := newFakeStudyStore()
	svc := NewStudyService(store)
	svc.now = func() time.Time { return time.Date(2026, 10, 12, 3, 0, 0, 0, time.UTC) }
	ctx := context.Background()

	for i := 0; i < 2; i++ {
		if _, err := svc.AddSession(ctx, 1, model.StudySession{Date: "2026-10-12", Minutes: 720, Mode: "stopwatch"}); err != nil {
			t.Fatalf("24時間ちょうどまでは記録できるはず: %v", err)
		}
	}
	_, err := svc.AddSession(ctx, 1, model.StudySession{Date: "2026-10-12", Minutes: 1, Mode: "pomodoro"})
	var ve *ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("24時間を超える記録はエラーのはず: %v", err)
	}
	// 別の日なら記録できる
	if _, err := svc.AddSession(ctx, 1, model.StudySession{Date: "2026-10-11", Minutes: 30, Mode: "pomodoro"}); err != nil {
		t.Fatal(err)
	}
}
