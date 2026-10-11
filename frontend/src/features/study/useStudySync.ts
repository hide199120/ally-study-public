import { useEffect } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useAppDispatch } from '../../app/hooks'
import { useGetMeQuery } from '../auth/authApi'
import { useGetStudyQuery } from './studyApi'
import { loadStudy, resetStudyData } from './studySlice'

/**
 * ログイン中のユーザーの学習記録をサーバーから読み込む。ログアウトしたら初期状態に戻す。
 * （記録や目標の保存は、変更したときに studyThunks で行う）
 */
export function useStudySync() {
  const dispatch = useAppDispatch()
  const { data: me } = useGetMeQuery()
  const { data: study } = useGetStudyQuery(me ? me.id : skipToken, { refetchOnMountOrArgChange: true })

  useEffect(() => {
    if (me && study) dispatch(loadStudy(study))
  }, [dispatch, me, study])

  useEffect(() => {
    if (me === null) dispatch(resetStudyData())
  }, [dispatch, me])
}
