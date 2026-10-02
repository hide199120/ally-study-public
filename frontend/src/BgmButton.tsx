import { useEffect, useRef, useState } from "react";

type Props = {
  /** public/ に置いた音源のパス */
  src: string;
  /** 最大音量 0〜1 */
  volume?: number;
  title?: string;
};

/** 押すとBGMがフェードインしてループ再生、もう一度押すとフェードアウトして停止 */
export default function BgmButton({ src, volume = 0.5, title = "Lo-fi room" }: Props) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    a.addEventListener("error", () => setError(true));
    audio.current = a;
    return () => {
      cancelAnimationFrame(fade.current);
      a.pause();
      audio.current = null;
    };
  }, [src]);

  const fadeTo = (target: number, ms: number, done?: () => void) => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(fade.current);
    const from = a.volume;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min((t - start) / ms, 1);
      a.volume = from + (target - from) * k;
      if (k < 1) fade.current = requestAnimationFrame(step);
      else done?.();
    };
    fade.current = requestAnimationFrame(step);
  };

  const toggle = async () => {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      setPlaying(false);
      fadeTo(0, 600, () => a.pause());
      return;
    }
    try {
      await a.play(); // クリック起点なので自動再生ブロックにかからない
      setError(false);
      setPlaying(true);
      fadeTo(volume, 1200);
    } catch {
      setError(true);
    }
  };

  return (
    <button
      type="button"
      className={`widget bgm${playing ? " is-playing" : ""}`}
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? "BGMを停止" : "BGMを再生"}
    >
      <span className="bgm__icon" aria-hidden>
        {playing ? (
          <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
        )}
      </span>
      <span className="bgm__text">
        <span className="bgm__label">{error ? "BGMを読み込めません" : playing ? "Now playing" : "BGM"}</span>
        <span className="bgm__title">{title}</span>
      </span>
      <span className="bgm__eq" aria-hidden>
        <i /><i /><i /><i />
      </span>
    </button>
  );
}
