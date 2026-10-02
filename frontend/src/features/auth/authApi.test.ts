import { getErrorMessage } from './authApi'

describe('getErrorMessage', () => {
  it('エラーがなければ null', () => {
    expect(getErrorMessage(undefined)).toBeNull()
  })

  it('APIが返したメッセージを取り出す', () => {
    const error = { status: 409, data: { code: 'username_taken', message: 'このユーザー名はすでに使われています' } }
    expect(getErrorMessage(error)).toBe('このユーザー名はすでに使われています')
  })

  it('通信エラーなどでメッセージがなければ、共通の文言にする', () => {
    expect(getErrorMessage({ status: 'FETCH_ERROR', error: 'Failed to fetch' })).toBe(
      '通信に失敗しました。時間をおいてもう一度お試しください',
    )
  })
})
