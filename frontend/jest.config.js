/** @type {import('jest').Config} */
export default {
  // jsdom（ブラウザのDOMを再現する環境）に、Node.js の fetch / Request / Response を足したもの
  testEnvironment: 'jest-fixed-jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // TypeScript / JSX を SWC で変換する（ts-jest より高速）
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  // CSS や画像の import はテストでは中身が不要なので、空のモジュールに置き換える
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/src/test/styleMock.cjs',
    '\\.(mp3|png|svg)$': '<rootDir>/src/test/fileMock.cjs',
  },
}
