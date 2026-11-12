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

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name       string
		ginMode    string
		dbPassword string // 空なら未設定
		anaPass    string // 空なら未設定（本体と同じになる）
		wantErr    bool
	}{
		{"本番で DB_PASSWORD が未設定なら止める", "release", "", "", true},
		{"本番で DB_PASSWORD が開発用の初期値と同じでも止める", "release", "ally_password", "", true},
		{"本番で解析 DB のパスワードが開発用の初期値なら止める", "release", "real-secret", "ally_password", true},
		{"本番で DB_PASSWORD を設定していれば起動できる", "release", "real-secret", "", false},
		{"本番以外なら初期値のままでも起動できる", "", "", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("GIN_MODE", tt.ginMode)
			t.Setenv("DB_PASSWORD", tt.dbPassword)
			t.Setenv("ANALYTICS_DB_PASSWORD", tt.anaPass)
			if err := Load().Validate(); (err != nil) != tt.wantErr {
				t.Errorf("Validate() = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
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
