import Room from "./Room";
import ClockWidget from "./ClockWidget";
import AccountWidget from "./features/auth/AccountWidget";
import AuthDialog from "./features/auth/AuthDialog";
import SoundWidget from "./features/sound/SoundWidget";
import "./App.css";

export default function App() {
  return (
    <main className="page">
      {/* 背景：薄緑 + ぼかした光 + 半透明のフィルター */}
      <div className="page__bg" aria-hidden>
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
      </div>
      <div className="page__veil" aria-hidden />

      {/* 真ん中に大きく3Dの部屋 */}
      <Room />

      {/* 左上のウィジェット */}
      <aside className="widgets">
        <ClockWidget />
        <SoundWidget />
      </aside>

      {/* 右上のアカウント表示 */}
      <aside className="widgets widgets--right">
        <AccountWidget />
      </aside>

      <AuthDialog />
    </main>
  );
}
