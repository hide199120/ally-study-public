import { useEffect, useId, useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { getErrorMessage, useLoginMutation, useSignupMutation } from './authApi'
import { closeAuthDialog, switchAuthMode } from './authDialogSlice'
import './auth.css'

/** ログイン/新規登録のダイアログ */
export default function AuthDialog() {
  const { isOpen, mode } = useAppSelector((state) => state.authDialog)
  if (!isOpen) return null
  // mode が変わったら入力欄をリセットするため key を付ける
  return <AuthDialogContent key={mode} mode={mode} />
}

function AuthDialogContent({ mode }: { mode: 'login' | 'signup' }) {
  const dispatch = useAppDispatch()
  const titleId = useId()
  const formId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [login, loginState] = useLoginMutation()
  const [signup, signupState] = useSignupMutation()
  const { isLoading, error } = mode === 'login' ? loginState : signupState
  const errorMessage = getErrorMessage(error)

  const close = () => dispatch(closeAuthDialog())

  // Escキーで閉じる
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch(closeAuthDialog())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submit = mode === 'login' ? login : signup
    const result = await submit({ username, password })
    if (!('error' in result)) close()
  }

  const isLogin = mode === 'login'

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="widget auth-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="auth-dialog__close" onClick={close} aria-label="閉じる">
          ×
        </button>

        <h2 id={titleId} className="auth-dialog__title">
          {isLogin ? 'おかえりなさい' : 'はじめまして'}
        </h2>
        <p className="auth-dialog__lead">
          {isLogin ? 'ログインして、今日の勉強をはじめましょう' : 'ユーザー名とパスワードを決めて登録します'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="ログイン方法">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className="auth-tabs__tab"
            onClick={() => dispatch(switchAuthMode('login'))}
          >
            ログイン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className="auth-tabs__tab"
            onClick={() => dispatch(switchAuthMode('signup'))}
          >
            新規登録
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor={`${formId}-username`}>ユーザー名</label>
            <input
              id={`${formId}-username`}
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              aria-describedby={isLogin ? undefined : `${formId}-username-hint`}
              autoFocus
              required
            />
            {!isLogin && <small id={`${formId}-username-hint`}>3〜32文字の半角英数字と _</small>}
          </div>

          <div className="auth-form__field">
            <label htmlFor={`${formId}-password`}>パスワード</label>
            <input
              id={`${formId}-password`}
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-describedby={isLogin ? undefined : `${formId}-password-hint`}
              required
            />
            {!isLogin && <small id={`${formId}-password-hint`}>8〜72文字</small>}
          </div>

          {errorMessage && (
            <p className="auth-form__error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" className="auth-form__submit" disabled={isLoading}>
            {isLoading ? '送信中…' : isLogin ? 'ログイン' : '登録してはじめる'}
          </button>
        </form>
      </div>
    </div>
  )
}
