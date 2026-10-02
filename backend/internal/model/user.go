// Package model はアプリ内で使うデータの形とエラーを定義する。
package model

import (
	"errors"
	"time"
)

// User はユーザー。
type User struct {
	ID           int64
	Username     string
	PasswordHash string
	CreatedAt    time.Time
}

var (
	// ErrNotFound は対象のデータが見つからないことを表す。
	ErrNotFound = errors.New("not found")
	// ErrUsernameTaken はユーザー名がすでに使われていることを表す。
	ErrUsernameTaken = errors.New("username already taken")
)
