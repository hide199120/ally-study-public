// toBeInTheDocument() などの DOM 用のマッチャーを使えるようにする
import '@testing-library/jest-dom'

afterEach(() => {
  jest.restoreAllMocks()
})
