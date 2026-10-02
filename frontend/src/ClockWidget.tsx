import { useEffect, useState } from "react";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

function greeting(h: number) {
  if (h < 5) return "Good night";
  if (h < 11) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** 左上のガラス風時計ウィジェット */
export default function ClockWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // 秒の切り替わりに合わせて更新
    let id: number;
    const tick = () => {
      setNow(new Date());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(id);
  }, []);

  const h = now.getHours();
  return (
    <section className="widget clock" aria-label="現在時刻">
      <p className="clock__greet">{greeting(h)}</p>
      <p className="clock__time">
        <time dateTime={now.toISOString()}>
          {pad(h)}
          <span className="clock__colon">:</span>
          {pad(now.getMinutes())}
        </time>
        <span className="clock__sec">{pad(now.getSeconds())}</span>
      </p>
      <p className="clock__date">
        {now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())}
        <span className="clock__dot" />
        {WEEK[now.getDay()]}
      </p>
    </section>
  );
}
