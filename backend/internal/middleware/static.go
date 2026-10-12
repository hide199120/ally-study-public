package middleware

import (
	"bytes"
	"compress/gzip"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

// compressible は gzip で小さくなるファイルの種類（画像や音声はもともと圧縮されているので対象外）。
var compressible = map[string]bool{".js": true, ".css": true, ".html": true, ".svg": true, ".json": true}

// gzipCache は、圧縮したファイルの中身を覚えておく（ビルドしたファイルは起動中に変わらないので一度だけ圧縮する）。
type gzipCache struct {
	mu    sync.Mutex
	files map[string][]byte
}

func (g *gzipCache) get(file string) ([]byte, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if b, ok := g.files[file]; ok {
		return b, nil
	}
	raw, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
	if _, err := w.Write(raw); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	g.files[file] = buf.Bytes()
	return g.files[file], nil
}

// serveGzip は、ブラウザが gzip を受け取れて、圧縮に向いたファイルなら、圧縮して返す。返したら true。
func (g *gzipCache) serveGzip(c *gin.Context, file string) bool {
	ext := strings.ToLower(filepath.Ext(file))
	if !compressible[ext] || !strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
		return false
	}
	body, err := g.get(file)
	if err != nil {
		return false
	}
	c.Header("Content-Encoding", "gzip")
	c.Header("Vary", "Accept-Encoding")
	c.Data(http.StatusOK, mime.TypeByExtension(ext), body)
	return true
}

// SPA は、ビルドしたフロント（dir）を配る。
// /api 以外で、ファイルが見つからないパスには index.html を返す（画面の表示は React が担当する）。
// API とフロントを同じドメインから配ることで、Cookie を他のサイトに送る設定（CORS など）が要らなくなる。
// gin の NoRoute（どのルートにも当てはまらなかったとき）に登録して使う。
func SPA(dir string) gin.HandlerFunc {
	fs := http.Dir(dir)
	files := http.FileServer(fs)
	gz := &gzipCache{files: map[string][]byte{}}
	return func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || p == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"code": "not_found", "message": "見つかりません"})
			return
		}
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.Status(http.StatusMethodNotAllowed)
			return
		}

		// path.Clean で "../" を取りのぞき、dir の外のファイルを読めないようにする
		clean := path.Clean("/" + p)
		if file := filepath.Join(dir, filepath.FromSlash(clean)); clean != "/" && fileExists(file) {
			if strings.HasPrefix(clean, "/assets/") {
				// ビルドしたファイルは名前にハッシュが付くので、長くキャッシュしてよい
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			if c.Request.Method == http.MethodGet && gz.serveGzip(c, file) {
				return
			}
			c.Request.URL.Path = clean
			files.ServeHTTP(c.Writer, c.Request)
			return
		}

		// index.html は、新しい版をすぐ反映するためキャッシュさせない
		c.Header("Cache-Control", "no-cache")
		index := filepath.Join(dir, "index.html")
		if c.Request.Method == http.MethodGet && gz.serveGzip(c, index) {
			return
		}
		c.File(index)
	}
}

func fileExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}
