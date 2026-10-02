import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { AVATARS, AVATAR_IDS, FURNITURE, WALLPAPERS, WALLPAPER_IDS } from './catalog'
import {
  placeFurniture,
  selectAvatar,
  selectBagItems,
  selectLayoutTab,
  selectPlacedItems,
  selectWallpaper,
  setAvatar,
  setTab,
  setWallpaper,
  storeFurniture,
  type LayoutTab,
} from './roomLayoutSlice'

const TABS: { id: LayoutTab; label: string }[] = [
  { id: 'bag', label: 'バッグ' },
  { id: 'wallpaper', label: '壁紙' },
  { id: 'avatar', label: '住人' },
]

/** 模様替えモード中に出るパネル（バッグの出し入れ・壁紙・住人の切り替え） */
export default function LayoutPanel({ loggedIn }: { loggedIn: boolean }) {
  const dispatch = useAppDispatch()
  const tab = useAppSelector(selectLayoutTab)

  return (
    <section className="layout-panel" aria-label="模様替え">
      <div className="layout-panel__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`layout-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`layout-tabpanel-${t.id}`}
            className="layout-panel__tab"
            onClick={() => dispatch(setTab(t.id))}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="layout-panel__body" role="tabpanel" id={`layout-tabpanel-${tab}`} aria-labelledby={`layout-tab-${tab}`}>
        {tab === 'bag' && <BagTab />}
        {tab === 'wallpaper' && <WallpaperTab />}
        {tab === 'avatar' && <AvatarTab />}
      </div>

      <p className="layout-panel__foot">
        {loggedIn ? '「完了」を押すと保存されます' : 'ログインすると模様替えを保存できます'}
      </p>
    </section>
  )
}

function BagTab() {
  const dispatch = useAppDispatch()
  const bag = useAppSelector(selectBagItems)
  const placed = useAppSelector(selectPlacedItems)

  return (
    <>
      <h3 className="layout-panel__heading">
        バッグの中 <span className="layout-panel__count">{bag.length}</span>
      </h3>
      {bag.length === 0 ? (
        <p className="layout-panel__empty">バッグは空っぽです</p>
      ) : (
        <ul className="bag-grid" aria-label="バッグの中の家具">
          {bag.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="bag-item"
                aria-label={`${FURNITURE[id].name}を部屋に出す`}
                onClick={() => dispatch(placeFurniture(id))}
              >
                <span className="bag-item__icon" aria-hidden>
                  {FURNITURE[id].icon}
                </span>
                <span className="bag-item__name">{FURNITURE[id].name}</span>
                <span className="bag-item__action" aria-hidden>
                  出す
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="layout-panel__heading">
        部屋にある家具 <span className="layout-panel__count">{placed.length}</span>
      </h3>
      <ul className="placed-list" aria-label="部屋にある家具">
        {placed.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="placed-chip"
              aria-label={`${FURNITURE[id].name}をバッグにしまう`}
              onClick={() => dispatch(storeFurniture(id))}
            >
              <span aria-hidden>{FURNITURE[id].icon}</span>
              {FURNITURE[id].name}
              <span className="placed-chip__x" aria-hidden>
                ↓
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="layout-panel__hint">部屋の家具はドラッグで移動、クリックすると「しまう」ボタンが出ます</p>
    </>
  )
}

function WallpaperTab() {
  const dispatch = useAppDispatch()
  const current = useAppSelector(selectWallpaper)
  return (
    <div className="swatch-grid" role="radiogroup" aria-label="壁紙">
      {WALLPAPER_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={current === id}
          className="swatch"
          onClick={() => dispatch(setWallpaper(id))}
        >
          <span className="swatch__sample" style={{ background: WALLPAPERS[id].swatch }} aria-hidden />
          <span className="swatch__name">{WALLPAPERS[id].name}</span>
        </button>
      ))}
    </div>
  )
}

function AvatarTab() {
  const dispatch = useAppDispatch()
  const current = useAppSelector(selectAvatar)
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="住人">
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={current === id}
          className="avatar-option"
          onClick={() => dispatch(setAvatar(id))}
        >
          <span className="avatar-option__icon" aria-hidden>
            {AVATARS[id].icon}
          </span>
          {AVATARS[id].name}
        </button>
      ))}
    </div>
  )
}
