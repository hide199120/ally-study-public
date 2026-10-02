import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useGetMeQuery } from '../auth/authApi'
import LayoutPanel from './LayoutPanel'
import { useSaveRoomMutation } from './roomApi'
import {
  finishEditing,
  resetLayout,
  selectHasMovedFurniture,
  selectIsEditingLayout,
  selectRoomForSave,
  startEditing,
} from './roomLayoutSlice'
import './layout.css'

type SaveStatus = 'saved' | 'error' | null

/**
 * 部屋の右下のボタン。「模様替え」を押すと家具を動かしたり、バッグから出し入れしたり、
 * 壁紙・住人を変えたりできる。「完了」でログイン中ならサーバーに保存する
 */
export default function LayoutToolbar() {
  const dispatch = useAppDispatch()
  const editing = useAppSelector(selectIsEditingLayout)
  const hasMoved = useAppSelector(selectHasMovedFurniture)
  const room = useAppSelector(selectRoomForSave)
  const { data: me } = useGetMeQuery()
  const [saveRoom, { isLoading: isSaving }] = useSaveRoomMutation()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)

  // 「保存しました」は少ししたら消す（エラーは次の操作まで残す）
  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timer = setTimeout(() => setSaveStatus(null), 2500)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const start = () => {
    setSaveStatus(null)
    dispatch(startEditing())
  }

  const finish = async () => {
    dispatch(finishEditing())
    if (!me) return
    try {
      await saveRoom({ userId: me.id, room }).unwrap()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  return (
    <div className="room-tools">
      {editing && <LayoutPanel loggedIn={!!me} />}
      {!editing && saveStatus && (
        <p className={`room-tools__note${saveStatus === 'error' ? ' room-tools__note--error' : ''}`} role="status">
          {saveStatus === 'saved' ? '模様替えを保存しました' : '保存できませんでした。もう一度「模様替え」→「完了」をお試しください'}
        </p>
      )}
      <div className="room-tools__buttons">
        {editing && (
          <button type="button" className="room-btn" onClick={() => dispatch(resetLayout())} disabled={!hasMoved}>
            配置をリセット
          </button>
        )}
        <button
          type="button"
          className={`room-btn${editing ? ' room-btn--primary' : ''}`}
          aria-pressed={editing}
          onClick={editing ? finish : start}
          disabled={isSaving}
        >
          {editing ? '完了' : isSaving ? '保存中…' : '模様替え'}
        </button>
      </div>
    </div>
  )
}
