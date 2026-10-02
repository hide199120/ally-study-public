/* =====================================================
   BGM（Lo-fi room 以外はプログラムで自動演奏している）
   ===================================================== */
import lofiRoomUrl from '../../../assets/bgm.mp3'
import { burst, chain, chance, filter, gain, midiToHz, noiseLoop, pick, rand, randInt, randomEvents, schedule, send, steps, tone, voice, type Generator } from './common'

/** Lo-fi room：音源ファイルをループ再生する */
export const lofiRoom: Generator = ({ ctx, out }) => {
  if (!(ctx instanceof AudioContext)) return voice([])
  const audio = new Audio(lofiRoomUrl)
  audio.loop = true
  const src = ctx.createMediaElementSource(audio)
  src.connect(out)
  void audio.play().catch(() => {})
  return {
    stop() {
      audio.pause()
      src.disconnect()
      audio.removeAttribute('src')
      audio.load()
    },
  }
}

type NoteOptions = { decay?: number; bright?: number }

/** ピアノっぽい音を1つ鳴らす（倍音を重ねて、高い倍音ほど早く消す） */
function pianoNote(ctx: BaseAudioContext, dest: AudioNode, t: number, midi: number, velocity: number, { decay = 1.2, bright = 1 }: NoteOptions = {}) {
  const f = midiToHz(midi)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(velocity, t + 0.006)
  env.gain.setTargetAtTime(0, t + 0.006, decay)
  const lp = filter(ctx, { type: 'lowpass', freq: Math.min(12000, f * 6 * bright), q: 0.5 })
  chain(lp, env, dest)
  const end = t + decay * 5
  const partials = [1, 0.45, 0.2, 0.1]
  let last: OscillatorNode | null = null
  partials.forEach((amp, i) => {
    const osc = ctx.createOscillator()
    osc.frequency.value = f * (i + 1) * (1 + 0.0005 * i * i)
    const pg = gain(ctx, amp)
    pg.gain.setTargetAtTime(0, t, decay / (1 + i * 0.8))
    chain(osc, pg, lp)
    osc.start(t)
    osc.stop(end)
    last = osc
  })
  if (last) (last as OscillatorNode).onended = () => env.disconnect()
}

/** オルゴールの音（澄んだ音 + 金属っぽいキラッとした音） */
function musicBoxNote(ctx: BaseAudioContext, dest: AudioNode, t: number, midi: number, velocity: number) {
  const f = midiToHz(midi)
  tone(ctx, { t, freq: f, peak: velocity, attack: 0.002, decay: 2.2, out: dest })
  tone(ctx, { t, freq: f * 2, peak: velocity * 0.12, attack: 0.002, decay: 0.8, out: dest })
  tone(ctx, { t, freq: f * 4.2, peak: velocity * 0.15, attack: 0.001, decay: 0.15, out: dest })
}

/** 少しだけタイミングをずらして人が弾いているようにする */
const human = () => rand(-0.012, 0.012)

/** ピアノ：ゆったりしたコードとメロディを自動で弾き続ける */
export const piano: Generator = ({ ctx, out, wet }) => {
  const bus = gain(ctx, 1)
  bus.connect(out)
  send(ctx, bus, wet, 0.8)

  const beat = 60 / 66
  // Fmaj7 → Em7 → Dm7 → Cmaj7
  const chords = [
    { bass: 41, notes: [53, 57, 60, 64] },
    { bass: 40, notes: [52, 55, 59, 62] },
    { bass: 38, notes: [50, 53, 57, 60] },
    { bass: 36, notes: [48, 52, 55, 59] },
  ]
  const scale = [69, 72, 74, 76, 79, 81, 84]
  let bar = 0
  let melody = 3

  const playBar = (t: number) => {
    const chord = chords[bar % chords.length]
    pianoNote(ctx, bus, t, chord.bass, 0.28, { decay: 2.2 })
    chord.notes.forEach((n, i) => pianoNote(ctx, bus, t + i * rand(0.025, 0.05), n, 0.13, { decay: 1.8, bright: 0.8 }))
    if (bar % 2 === 1) chord.notes.forEach((n, i) => pianoNote(ctx, bus, t + beat * 2 + i * 0.03, n, 0.07, { decay: 1.4, bright: 0.7 }))
    for (let step = 0; step < 8; step++) {
      if (!chance(step % 2 === 0 ? 0.35 : 0.15)) continue
      melody = Math.min(scale.length - 1, Math.max(0, melody + pick([-2, -1, -1, 1, 1, 2])))
      pianoNote(ctx, bus, t + (step * beat) / 2 + human(), scale[melody], rand(0.1, 0.2), { decay: 1.3 })
    }
    bar++
    return beat * 4
  }
  const stop = schedule(ctx, steps(playBar, 0.1))
  return voice([], [stop])
}

/** オルゴール：ワルツのメロディをくり返す */
export const musicBox: Generator = ({ ctx, out, wet }) => {
  const bus = gain(ctx, 1)
  bus.connect(out)
  send(ctx, bus, wet, 0.7)

  const beat = 60 / 88
  // 1小節3拍。[ベース, メロディ3音]
  const bars: [number, number[]][] = [
    [60, [76, 79, 84]],
    [55, [83, 79, 74]],
    [57, [81, 84, 76]],
    [52, [79, 76, 71]],
    [53, [77, 81, 84]],
    [48, [79, 76, 72]],
    [50, [74, 77, 81]],
    [55, [79, 74, 71]],
  ]
  let bar = 0
  const playBar = (t: number) => {
    const [bass, notes] = bars[bar % bars.length]
    musicBoxNote(ctx, bus, t, bass, 0.12)
    notes.forEach((n, i) => musicBoxNote(ctx, bus, t + i * beat + human(), n, 0.16))
    if (chance(0.3)) musicBoxNote(ctx, bus, t + beat * 2.5, pick(notes) + 12, 0.07)
    bar++
    return beat * 3
  }
  const stop = schedule(ctx, steps(playBar, 0.1))
  return voice([], [stop])
}

/** ローファイビート：ゆるいドラム + コード + ベース + レコードのノイズ */
export const lofiBeats: Generator = ({ ctx, out, wet }) => {
  // 全体を少しこもらせて、ローファイっぽい音にする
  const bus = gain(ctx, 1)
  chain(bus, filter(ctx, { type: 'lowpass', freq: 3800, q: 0.4 }), out)
  send(ctx, bus, wet, 0.25)

  const vinyl = noiseLoop(ctx, 'pink')
  chain(vinyl, filter(ctx, { type: 'bandpass', freq: 5000, q: 0.5 }), gain(ctx, 0.015), out)
  const crackle = randomEvents(
    () => 3,
    (t) => burst(ctx, { t, duration: 0.01, peak: rand(0.03, 0.12), decay: 0.004, filter: { type: 'highpass', freq: 2000 }, out }),
  )

  const beat = 60 / 78
  const swing = beat * 0.08
  // Dm9 → G13 → Cmaj9 → Am9
  const chords = [
    { bass: 38, notes: [53, 57, 60, 64] },
    { bass: 43, notes: [53, 57, 59, 64] },
    { bass: 36, notes: [52, 55, 59, 62] },
    { bass: 45, notes: [55, 59, 60, 64] },
  ]
  const scale = [69, 72, 74, 76, 79, 81]

  const kick = (t: number) => tone(ctx, { t, freq: 140, endFreq: 45, peak: 0.8, attack: 0.002, decay: 0.32, out: bus })
  const snare = (t: number) => {
    burst(ctx, { t, duration: 0.25, peak: 0.28, decay: 0.16, filter: { type: 'bandpass', freq: 1800, q: 0.7 }, out: bus, wet, wetAmount: 0.3 })
    tone(ctx, { t, freq: 190, endFreq: 150, peak: 0.18, decay: 0.08, out: bus })
  }
  const hat = (t: number, v: number) => burst(ctx, { t, duration: 0.06, peak: v, decay: 0.03, filter: { type: 'highpass', freq: 7000 }, out: bus })

  let bar = 0
  const playBar = (t: number) => {
    const chord = chords[bar % chords.length]
    const kicks = bar % 2 === 0 ? [0, 2.5] : [0, 2.25, 2.75]
    kicks.forEach((b) => kick(t + b * beat))
    ;[1, 3].forEach((b) => snare(t + b * beat + human()))
    for (let i = 0; i < 8; i++) {
      const off = i % 2 === 1
      hat(t + (i * beat) / 2 + (off ? swing : 0) + human(), off ? rand(0.04, 0.07) : rand(0.08, 0.12))
    }
    chord.notes.forEach((n, i) => pianoNote(ctx, bus, t + i * 0.02 + human(), n, 0.1, { decay: 1.1, bright: 0.6 }))
    if (chance(0.5)) chord.notes.forEach((n, i) => pianoNote(ctx, bus, t + beat * 2.5 + swing + i * 0.015, n, 0.06, { decay: 0.6, bright: 0.5 }))
    ;[0, 2.5].forEach((b) => tone(ctx, { t: t + b * beat, freq: midiToHz(chord.bass), type: 'triangle', peak: 0.35, attack: 0.01, decay: 0.9, out: bus }))
    if (chance(0.4)) {
      const n = randInt(2, 4)
      for (let i = 0; i < n; i++) pianoNote(ctx, bus, t + beat * (1 + i * 0.75) + swing + human(), pick(scale), rand(0.07, 0.12), { decay: 0.9, bright: 0.7 })
    }
    bar++
    return beat * 4
  }
  const drums = steps(playBar, 0.1)
  const stop = schedule(ctx, (from, to) => {
    crackle(from, to)
    drums(from, to)
  })
  return voice([vinyl], [stop])
}
