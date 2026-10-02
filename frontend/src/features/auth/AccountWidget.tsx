import { useAppDispatch } from '../../app/hooks'
import { useGetMeQuery, useLogoutMutation } from './authApi'
import { openAuthDialog } from './authDialogSlice'
import './auth.css'

/** 右上のアカウント表示。未ログインならログインボタン、ログイン中ならユーザー名とログアウトボタン */
export default function AccountWidget() {
  const dispatch = useAppDispatch()
  const { data: user, isLoading } = useGetMeQuery()
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()

  if (isLoading) return null

  if (!user) {
    return (
      <div className="widget account">
        <button type="button" className="account__button" onClick={() => dispatch(openAuthDialog('login'))}>
          ログイン
        </button>
        <button
          type="button"
          className="account__button account__button--primary"
          onClick={() => dispatch(openAuthDialog('signup'))}
        >
          新規登録
        </button>
      </div>
    )
  }

  return (
    <div className="widget account">
      <span className="account__avatar" aria-hidden>
        {user.username.slice(0, 1).toUpperCase()}
      </span>
      <span className="account__name">
        <span className="account__label">Studying</span>
        {user.username}
      </span>
      <button type="button" className="account__button" onClick={() => logout()} disabled={isLoggingOut}>
        ログアウト
      </button>
    </div>
  )
}
