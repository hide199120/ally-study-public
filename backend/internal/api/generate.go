// Package api は api/openapi.yaml から自動生成したコードを置くパッケージ。
// openapi.gen.go は手で編集せず、仕様を変えたら `go generate ./...` で作り直す。
package api

//go:generate go tool oapi-codegen -config oapi-codegen.yaml ../../../api/openapi.yaml
