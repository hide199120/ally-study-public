import { screen } from '@testing-library/react'
import { renderWithStore } from '../../test/utils'
import ThemePicker from './ThemePicker'
import { useApplyTheme } from './useApplyTheme'

function WithApply() {
  useApplyTheme()
  return <ThemePicker />
}

describe('ThemePicker', () => {
  beforeEach(() => localStorage.clear())

  it('選んだテーマが画面の色（CSS 変数）と保存に反映される', async () => {
    const { user } = renderWithStore(<WithApply />)
    expect(screen.getByRole('radio', { name: '森の木漏れ日' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('radio', { name: '雨の夜' }))
    expect(screen.getByRole('radio', { name: '雨の夜' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.dataset.theme).toBe('rain')
    expect(document.documentElement.style.getPropertyValue('--accent-rgb')).toBe('246 193 119')
    expect(localStorage.getItem('ally-study:theme')).toBe('rain')
  })
})
