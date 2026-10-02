import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

// 型付きの useDispatch / useSelector（コンポーネントではこちらを使う）
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
