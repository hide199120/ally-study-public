import { useEffect } from 'react'
import { useAppSelector } from '../../app/hooks'
import { saveTheme, selectTheme } from './themeSlice'
import { themeCssVars } from './themes'

/** 選んでいるテーマの色を、ページ全体の CSS 変数に反映する */
export function useApplyTheme() {
  const theme = useAppSelector(selectTheme)
  useEffect(() => {
    const root = document.documentElement
    for (const [key, value] of Object.entries(themeCssVars(theme.ui))) root.style.setProperty(key, value)
    root.dataset.theme = theme.id
    root.style.colorScheme = theme.ui.colorScheme
    saveTheme(theme.id)
  }, [theme])
}
