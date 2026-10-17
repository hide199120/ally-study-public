package config

import (
	"reflect"
	"testing"
)

func TestLoad_AnalyticsDB(t *testing.T) {
	t.Run("ANALYTICS_DB_* がなければ本体と同じ DB を使う", func(t *testing.T) {
		t.Setenv("DB_HOST", "main-host")
		t.Setenv("DB_NAME", "main")
		cfg := Load()
		if cfg.AnalyticsDB != cfg.DB {
			t.Errorf("AnalyticsDB = %+v, want %+v", cfg.AnalyticsDB, cfg.DB)
		}
	})

	t.Run("ANALYTICS_DB_* があればそちらを使う", func(t *testing.T) {
		t.Setenv("DB_HOST", "main-host")
		t.Setenv("ANALYTICS_DB_HOST", "analytics-host")
		t.Setenv("ANALYTICS_DB_NAME", "analytics")
		cfg := Load()
		if cfg.AnalyticsDB.Host != "analytics-host" || cfg.AnalyticsDB.Name != "analytics" {
			t.Errorf("AnalyticsDB = %+v", cfg.AnalyticsDB)
		}
		if cfg.AnalyticsDB.User != cfg.DB.User {
			t.Errorf("設定していない項目は本体と同じはず: %q", cfg.AnalyticsDB.User)
		}
	})
}

func TestParseIDs(t *testing.T) {
	got := parseIDs(" 1, 23 ,abc,,-4,0")
	want := []int64{1, 23}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
	if parseIDs("") != nil {
		t.Error("空なら nil のはず")
	}
}
