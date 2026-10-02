import { useRef, useState } from "react";
import "./App.css";
import bgm from "./bgm.mp3";

function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleMusic = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("BGMの再生に失敗しました:", error);
    }
  };

  return (
    <main className="hero">
      <div className="overlay">
       

        

        <button onClick={toggleMusic}>
          {isPlaying ? "🔇 BGMを停止" : "🎵 BGMを再生"}
        </button>
      </div>

      <audio ref={audioRef} src={bgm} loop preload="auto" />
    </main>
  );
}

export default App;
