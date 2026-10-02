import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { finishEditing, resetLayout, selectHasMovedFurniture, selectIsEditingLayout, startEditing } from './roomLayoutSlice'

/** 部屋の右下のボタン。「模様替え」を押すと家具を動かせるようになる */
export default function LayoutToolbar() {
  const dispatch = useAppDispatch()
  const editing = useAppSelector(selectIsEditingLayout)
  const hasMoved = useAppSelector(selectHasMovedFurniture)

  return (
    <div className="room-tools">
      {editing && (
        <p className="room-tools__note" role="status">
          家具をドラッグして動かせます
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
          onClick={() => dispatch(editing ? finishEditing() : startEditing())}
        >
          {editing ? '完了' : '模様替え'}
        </button>
      </div>
    </div>
  )
}
