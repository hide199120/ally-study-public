package model

// 部屋の初期設定（まだ一度も保存していないユーザーに返す値）
const (
	DefaultAvatar    = "girl"
	DefaultWallpaper = "meadow"
)

// Room はユーザーごとの部屋の設定。
type Room struct {
	Avatar    string
	Wallpaper string
	// Furniture は保存されている家具の状態。ここにない家具はフロントの初期状態として扱う
	Furniture []FurniturePlacement
}

// FurniturePlacement は1つの家具の状態。
type FurniturePlacement struct {
	ID string
	// Placed が true なら部屋に出している、false ならバッグ（インベントリ）の中
	Placed bool
	// X, Z は初期位置から床の上でどれだけ動かしたか
	X float64
	Z float64
}

// DefaultRoom は初期状態の部屋を返す。
func DefaultRoom() *Room {
	return &Room{Avatar: DefaultAvatar, Wallpaper: DefaultWallpaper, Furniture: []FurniturePlacement{}}
}
