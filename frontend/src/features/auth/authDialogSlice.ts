import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AuthMode = 'login' | 'signup'

type AuthDialogState = {
  isOpen: boolean
  mode: AuthMode
}

const initialState: AuthDialogState = { isOpen: false, mode: 'login' }

/** ログイン/新規登録ダイアログの開閉と、どちらのタブを表示するかを管理する */
const authDialogSlice = createSlice({
  name: 'authDialog',
  initialState,
  reducers: {
    openAuthDialog(state, action: PayloadAction<AuthMode | undefined>) {
      state.isOpen = true
      state.mode = action.payload ?? 'login'
    },
    closeAuthDialog(state) {
      state.isOpen = false
    },
    switchAuthMode(state, action: PayloadAction<AuthMode>) {
      state.mode = action.payload
    },
  },
})

export const { openAuthDialog, closeAuthDialog, switchAuthMode } = authDialogSlice.actions
export const authDialogReducer = authDialogSlice.reducer
