import { authDialogReducer, closeAuthDialog, openAuthDialog, switchAuthMode } from './authDialogSlice'

describe('authDialogSlice', () => {
  const initial = authDialogReducer(undefined, { type: '@@INIT' })

  it('初期状態では閉じていて、ログインタブになっている', () => {
    expect(initial).toEqual({ isOpen: false, mode: 'login' })
  })

  it('openAuthDialog で指定したタブを開く', () => {
    expect(authDialogReducer(initial, openAuthDialog('signup'))).toEqual({ isOpen: true, mode: 'signup' })
  })

  it('openAuthDialog でタブを指定しなければログインタブを開く', () => {
    const signupOpened = { isOpen: false, mode: 'signup' as const }
    expect(authDialogReducer(signupOpened, openAuthDialog())).toEqual({ isOpen: true, mode: 'login' })
  })

  it('switchAuthMode でタブだけを切り替える', () => {
    const opened = authDialogReducer(initial, openAuthDialog('login'))
    expect(authDialogReducer(opened, switchAuthMode('signup'))).toEqual({ isOpen: true, mode: 'signup' })
  })

  it('closeAuthDialog で閉じる', () => {
    const opened = authDialogReducer(initial, openAuthDialog('login'))
    expect(authDialogReducer(opened, closeAuthDialog()).isOpen).toBe(false)
  })
})
