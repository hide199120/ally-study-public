import Room from "./Room";
import ClockWidget from "./ClockWidget";
import AccountWidget from "./features/auth/AccountWidget";
import AuthDialog from "./features/auth/AuthDialog";
import SoundWidget from "./features/sound/SoundWidget";
import TimerWidget from "./features/study/TimerWidget";
import StatsWidget from "./features/study/StatsWidget";
import GoalsWidget from "./features/study/GoalsWidget";
import { useStudySync } from "./features/study/useStudySync";
import "./App.css";

export default function App() {
  // ログイン中なら、その人の学習記録（勉強時間・目標）を読み込む
  useStudySync();

  return (
    <main className="page">
      {/* 背景：薄緑 + ぼかした光 + 半透明のフィルター */}
      <div className="page__bg" aria-hidden>
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
      </div>
      <div className="page__veil" aria-hidden />

      {/* 広い画面では「左の列・3Dの部屋・右の列」の3列。狭い画面では部屋の下に並べる */}
      <div className="layout">
        <div className="layout__stage">
          <Room />
        </div>

        {/* 左：時計・サウンド・タイマー */}
        <aside className="widgets widgets--left" aria-label="時計とタイマー">
          <ClockWidget />
          <SoundWidget />
          <TimerWidget />
        </aside>

        {/* 右：アカウント・学習記録・目標 */}
        <aside className="widgets widgets--right" aria-label="アカウントと学習記録">
          <AccountWidget />
          <StatsWidget />
          <GoalsWidget />
        </aside>
      </div>

      <AuthDialog />
    </main>
  );
}
