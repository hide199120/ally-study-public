import Room from "./Room";
import ClockWidget from "./ClockWidget";
import AccountWidget from "./features/auth/AccountWidget";
import AuthDialog from "./features/auth/AuthDialog";
import SoundWidget from "./features/sound/SoundWidget";
import TimerWidget from "./features/study/TimerWidget";
import StatsWidget from "./features/study/StatsWidget";
import GoalsWidget from "./features/study/GoalsWidget";
import { useStudySync } from "./features/study/useStudySync";
import { useAppSelector } from "./app/hooks";
import { selectIsEditingLayout } from "./features/room/roomLayoutSlice";
import ThemePicker from "./features/theme/ThemePicker";
import { useApplyTheme } from "./features/theme/useApplyTheme";
import "./App.css";

export default function App() {
  // 選んでいるテーマの色を画面全体に反映する
  useApplyTheme();
  // ログイン中なら、その人の学習記録（勉強時間・目標）を読み込む
  useStudySync();
  // 模様替え中は、部屋のタイルを盤面いっぱいに広げる
  const editingRoom = useAppSelector(selectIsEditingLayout);

  return (
    <main className="page">
      {/* 背景（テーマの色）。ほとんどはタイルで隠れる */}
      <div className="page__bg" aria-hidden>
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
      </div>

      <header className="topbar">
        <p className="topbar__brand">ally-study</p>
        <ThemePicker />
        <div className="topbar__end">
          <SoundWidget />
          <AccountWidget />
        </div>
      </header>

      {/* タイルを画面いっぱいに敷きつめる */}
      <div className="board">
        <section className={`widget tile-room${editingRoom ? " is-expanded" : ""}`} aria-label="部屋">
          <Room />
        </section>
        <TimerWidget />
        <GoalsWidget />
        <StatsWidget />
        <ClockWidget />
      </div>

      <AuthDialog />
    </main>
  );
}
