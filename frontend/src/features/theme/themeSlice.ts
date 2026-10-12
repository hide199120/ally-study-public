import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeId } from './themes'

const STORAGE_KEY = 'ally-study:theme'

/** 前回選んだテーマ（このブラウザに保存）。読めなければ最初のテーマ */
function loadSavedTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return isThemeId(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function saveTheme(id: ThemeId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // 保存できない環境（プライベートモードなど）では、この画面の間だけ有効にする
  }
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: () => ({ id: loadSavedTheme() }),
  reducers: {
    setTheme(state, action: PayloadAction<ThemeId>) {
      state.id = action.payload
    },
  },
})

export const { setTheme } = themeSlice.actions
export const themeReducer = themeSlice.reducer
export const selectThemeId = (state: RootState) => state.theme.id
export const selectTheme = (state: RootState) => THEMES[state.theme.id]
