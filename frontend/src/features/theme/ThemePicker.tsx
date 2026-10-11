import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { selectThemeId, setTheme } from './themeSlice'
import { THEME_IDS, THEMES } from './themes'
import './theme.css'

/** 部屋の雰囲気を選ぶ。選ぶと部屋・窓の外・画面の色がまとめて変わる */
export default function ThemePicker() {
  const dispatch = useAppDispatch()
  const current = useAppSelector(selectThemeId)
  return (
    <div className="theme-picker" role="radiogroup" aria-label="部屋の雰囲気">
      {THEME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={current === id}
          className={`theme-picker__item theme-picker__item--${id}`}
          title={THEMES[id].caption}
          onClick={() => dispatch(setTheme(id))}
        >
          <span className="theme-picker__swatch" aria-hidden />
          <span className="theme-picker__name">{THEMES[id].name}</span>
        </button>
      ))}
    </div>
  )
}
