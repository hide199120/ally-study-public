import { makeStore } from '../../app/store'
import { selectTheme, setTheme } from './themeSlice'
import { THEME_IDS, THEMES, themeCssVars } from './themes'

describe('themeSlice', () => {
  beforeEach(() => localStorage.clear())

  it('最初は森のテーマ', () => {
    expect(selectTheme(makeStore().getState()).id).toBe('forest')
  })

  it('前回選んだテーマを読み込む（知らない値なら森）', () => {
    localStorage.setItem('ally-study:theme', 'rain')
    expect(selectTheme(makeStore().getState()).id).toBe('rain')
    localStorage.setItem('ally-study:theme', 'space')
    expect(selectTheme(makeStore().getState()).id).toBe('forest')
  })

  it('テーマを切り替える', () => {
    const store = makeStore()
    store.dispatch(setTheme('city'))
    expect(selectTheme(store.getState()).name).toBe('都会の夜')
  })

  it('どのテーマも同じ CSS 変数をそろえている', () => {
    const keys = Object.keys(themeCssVars(THEMES.forest.ui)).sort()
    for (const id of THEME_IDS) expect(Object.keys(themeCssVars(THEMES[id].ui)).sort()).toEqual(keys)
  })
})
