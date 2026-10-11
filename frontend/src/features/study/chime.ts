/* タイマーが終わったときの「ポーン」という音（音源ファイルを使わずに合成する） */
let ctx: AudioContext | null = null

/** クリックなどの操作の中で呼んで、ブラウザの自動再生ブロックを解除しておく */
export function unlockChime() {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

export function playChime() {
  if (!ctx) return
  const now = ctx.currentTime
  // 2つの音を少しずらして鳴らす（ド→ソ）
  ;[523.25, 783.99].forEach((freq, i) => {
    const t = now + i * 0.18
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 1.3)
  })
}
