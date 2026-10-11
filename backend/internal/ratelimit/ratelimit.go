// Package ratelimit は、同じ相手からの操作を一定時間に何回まで受け付けるかを数える。
package ratelimit

import (
	"sync"
	"time"
)

// Limiter は「同じ相手（キー）からのリクエストを、一定時間に何回まで受け付けるか」を数える。
// 時間を区切った窓ごとに回数を数える、シンプルな方式（固定ウィンドウ）。
// サーバー1台で動かす前提なので、メモリ上で数える。
type Limiter struct {
	limit  int
	window time.Duration
	now    func() time.Time

	mu      sync.Mutex
	buckets map[string]*bucket
}

type bucket struct {
	count   int
	resetAt time.Time
}

// maxBuckets を超えたら、期限切れの記録を掃除する（メモリを使いすぎないように）。
const maxBuckets = 10000

// New は window の間に limit 回まで受け付ける Limiter を作る。
func New(limit int, window time.Duration) *Limiter {
	return &Limiter{limit: limit, window: window, now: time.Now, buckets: map[string]*bucket{}}
}

// Allow は key からのリクエストを1回分数え、受け付けてよいかを返す。
// 受け付けられないときは、あと何秒待てばよいかも返す。
func (l *Limiter) Allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	if len(l.buckets) >= maxBuckets {
		for k, b := range l.buckets {
			if !now.Before(b.resetAt) {
				delete(l.buckets, k)
			}
		}
	}

	b, ok := l.buckets[key]
	if !ok || !now.Before(b.resetAt) {
		b = &bucket{resetAt: now.Add(l.window)}
		l.buckets[key] = b
	}
	if b.count >= l.limit {
		return false, b.resetAt.Sub(now)
	}
	b.count++
	return true, 0
}

// SetClock は時刻の取り方を差し替える（テスト用）。
func (l *Limiter) SetClock(now func() time.Time) { l.now = now }

// Exceeded は key がすでに上限に達しているかを返す（数は増やさない）。
func (l *Limiter) Exceeded(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.buckets[key]
	return ok && l.now().Before(b.resetAt) && b.count >= l.limit
}
