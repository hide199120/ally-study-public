package model

// DefaultWeeklyGoalMinutes は、まだ設定していないユーザーの週の目標時間（10時間）。
const DefaultWeeklyGoalMinutes = 600

// DateLayout は日付（YYYY-MM-DD）の形式。
const DateLayout = "2006-01-02"

// StudySession はタイマーで勉強した1回分の記録。
type StudySession struct {
	Date    string // ユーザーのタイムゾーンでの日付（YYYY-MM-DD）
	Minutes int
	Mode    string // pomodoro / stopwatch
}

// StudyDay は1日の勉強時間の合計。
type StudyDay struct {
	Date    string
	Minutes int
}

// StudyGoal は資格やタスクの目標。
type StudyGoal struct {
	ID      string
	Kind    string // certification / task
	Title   string
	DueDate *string // 期限・試験日（なければ nil）
	Done    bool
}

// StudyOverview はユーザーの学習記録をまとめたもの。
type StudyOverview struct {
	WeeklyGoalMinutes int
	Goals             []StudyGoal
	Days              []StudyDay
}
