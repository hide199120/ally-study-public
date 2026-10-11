import { useEffect, useId, useState, type FormEvent } from 'react'
import { getErrorMessage, useDeleteMeMutation } from './authApi'
import './auth.css'

/** 退会の確認ダイアログ。パスワードを入れてもらってから、アカウントとデータを削除する */
export default function DeleteAccountDialog({ username, onClose }: { username: string; onClose: () => void }) {
  const titleId = useId()
  const passwordId = useId()
  const [password, setPassword] = useState('')
  const [deleteMe, { isLoading, error }] = useDeleteMeMutation()
  const errorMessage = getErrorMessage(error)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!password) return
    const result = await deleteMe({ password })
    if (!('error' in result)) onClose()
  }

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="widget auth-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="auth-dialog__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <h2 id={titleId} className="auth-dialog__title">
          退会する
        </h2>
        <p className="auth-dialog__lead">「{username}」のアカウントを削除します。元には戻せません。</p>
        <ul className="danger-list">
          <li>部屋の模様替え</li>
          <li>勉強の記録・週の目標・資格やタスク</li>
          <li>ログイン情報</li>
        </ul>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor={passwordId}>確認のため、パスワードを入力してください</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          {errorMessage && (
            <p className="auth-form__error" role="alert">
              {errorMessage}
            </p>
          )}
          <button type="submit" className="auth-form__submit auth-form__submit--danger" disabled={isLoading || !password}>
            {isLoading ? '削除中…' : 'すべて削除して退会する'}
          </button>
        </form>
      </div>
    </div>
  )
}
