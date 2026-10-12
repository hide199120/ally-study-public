import { configureStore } from '@reduxjs/toolkit'
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
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware),
  })
}

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
