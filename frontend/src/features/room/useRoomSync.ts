import { useEffect } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useAppDispatch } from '../../app/hooks'
import { useGetMeQuery } from '../auth/authApi'
import { useGetRoomQuery } from './roomApi'
import { loadRoom, resetRoom } from './roomLayoutSlice'

/**
 * ログイン中のユーザーの部屋をサーバーから読み込んで、画面の部屋に反映する。
 * ログアウトしたら初期状態の部屋に戻す。
 * （保存は模様替えの「完了」を押したときに LayoutToolbar で行う）
 */
export function useRoomSync() {
  const dispatch = useAppDispatch()
  const { data: me } = useGetMeQuery()
  const { data: room } = useGetRoomQuery(me ? me.id : skipToken, { refetchOnMountOrArgChange: true })

  useEffect(() => {
    if (me && room) dispatch(loadRoom(room))
  }, [dispatch, me, room])

  useEffect(() => {
    // undefined は読み込み中、null は未ログイン
    if (me === null) dispatch(resetRoom())
  }, [dispatch, me])
}
