package database

import (
	"reflect"
	"testing"
	"testing/fstest"
)

func TestListMigrations(t *testing.T) {
	fsys := fstest.MapFS{
		"m/000002_b.up.sql":   {Data: []byte("x")},
		"m/000002_b.down.sql": {Data: []byte("x")},
		"m/000010_c.up.sql":   {Data: []byte("x")},
		"m/000001_a.up.sql":   {Data: []byte("x")},
	}
	got, err := listMigrations(fsys, "m")
	if err != nil {
		t.Fatal(err)
	}
	want := []migration{{1, "000001_a.up.sql"}, {2, "000002_b.up.sql"}, {10, "000010_c.up.sql"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}

	fsys["m/000002_dup.up.sql"] = &fstest.MapFile{Data: []byte("x")}
	if _, err := listMigrations(fsys, "m"); err == nil {
		t.Error("番号が重複していたらエラーのはず")
	}
}

func TestSplitStatements(t *testing.T) {
	got := splitStatements("-- コメント\nCREATE TABLE a (id INT);\n\nCREATE TABLE b (id INT);\n")
	want := []string{"CREATE TABLE a (id INT)", "CREATE TABLE b (id INT)"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %q, want %q", got, want)
	}
}
