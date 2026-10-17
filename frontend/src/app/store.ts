import { configureStore } from '@reduxjs/toolkit'
import { analyticsListener } from '../features/analytics/analyticsListener'
import { authApi } from '../features/auth/authApi'
import { authDialogReducer } from '../features/auth/authDialogSlice'
import { roomLayoutReducer } from '../features/room/roomLayoutSlice'
import { soundReducer } from '../features/sound/soundSlice'
import { studyReducer } from '../features/study/studySlice'
import { themeReducer } from '../features/theme/themeSlice'

export function makeStore() {
  return configureStore({
    reducer: {
      authDialog: authDialogReducer,
      roomLayout: roomLayoutReducer,
      sound: soundReducer,
      study: studyReducer,
      theme: themeReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    // 解析のリスナーは、アクションを見るだけで状態は変えない
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(analyticsListener.middleware).concat(authApi.middleware),
  })
}

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
