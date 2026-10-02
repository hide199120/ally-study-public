/* =====================================================
   音づくりの共通部品（ノイズ・単発の音・スケジューラー）
   ===================================================== */

/** 1つの音（雨、ピアノなど）の出力先。out はそのまま、wet はリバーブを通して鳴る */
export type Bus = { ctx: BaseAudioContext; out: AudioNode; wet: AudioNode }
/** 鳴っている音を止めるためのハンドル */
export type Voice = { stop: () => void }
/** 音を作る関数 */
export type Generator = (bus: Bus) => Voice

export const rand = (min: number, max: number) => min + Math.random() * (max - min)
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]
export const chance = (p: number) => Math.random() < p
export const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/* ---------- ノイズ ---------- */
export type NoiseKind = 'white' | 'pink' | 'brown'

const NOISE_SECONDS = 8
const LOOP_FADE = 0.05
const noiseCache = new WeakMap<BaseAudioContext, Partial<Record<NoiseKind, AudioBuffer>>>()

/**
 * ノイズの音データを作る（ctx ごとにキャッシュ）。
 * white: シャー（高音多め） / pink: ザー（自然な雨や波） / brown: ゴー（低音多め）
 */
export function noiseBuffer(ctx: BaseAudioContext, kind: NoiseKind): AudioBuffer {
  let entry = noiseCache.get(ctx)
  if (!entry) {
    entry = {}
    noiseCache.set(ctx, entry)
  }
  const cached = entry[kind]
  if (cached) return cached

  const sr = ctx.sampleRate
  const length = Math.floor(sr * NOISE_SECONDS)
  const buffer = ctx.createBuffer(2, length, sr)
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') {
        d[i] = w
      } else if (kind === 'pink') {
        // Paul Kellet のピンクノイズ
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
        b6 = w * 0.115926
      } else {
        last = (last + 0.02 * w) / 1.02
        d[i] = last
      }
    }
    // ループのつなぎ目で「プチッ」と鳴らないように、先頭と末尾をなじませる
    const fade = Math.floor(sr * LOOP_FADE)
    for (let i = 0; i < fade; i++) {
      const k = i / fade
      d[i] = d[i] * k + d[length - fade + i] * (1 - k)
    }
    // 種類ごとに音の大きさをそろえる（RMS 0.3）
    let sum = 0
    for (let i = 0; i < length; i++) sum += d[i] * d[i]
    const scale = 0.3 / Math.sqrt(sum / length)
    for (let i = 0; i < length; i++) d[i] *= scale
  }
  entry[kind] = buffer
  return buffer
}

/** ずっと鳴り続けるノイズ */
export function noiseLoop(ctx: BaseAudioContext, kind: NoiseKind): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, kind)
  src.loop = true
  src.loopEnd = NOISE_SECONDS - LOOP_FADE
  src.start(ctx.currentTime, rand(0, NOISE_SECONDS - 1))
  return src
}

type FilterSpec = { type: BiquadFilterType; freq: number; q?: number }

export function filter(ctx: BaseAudioContext, { type, freq, q = 0.7 }: FilterSpec) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

export function gain(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain()
  g.gain.value = value
  return g
}

export function panner(ctx: BaseAudioContext, pan: number) {
  const p = ctx.createStereoPanner()
  p.pan.value = pan
  return p
}

/** ノードを順番につなぐ */
export function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}

/** 出力先に、音量を変えて送る（リバーブへの送り量など） */
export function send(ctx: BaseAudioContext, from: AudioNode, to: AudioNode, amount: number) {
  if (amount <= 0) return
  from.connect(gain(ctx, amount)).connect(to)
}

/* ---------- 単発の音 ---------- */
type BurstSpec = {
  t: number
  kind?: NoiseKind
  duration: number
  peak: number
  attack?: number
  /** 音が消えるまでの時間 */
  decay: number
  filter?: FilterSpec
  pan?: number
  out: AudioNode
  wet?: AudioNode
  wetAmount?: number
}

/** 短いノイズ（雨粒、パチッという音、ドラムなど） */
export function burst(ctx: BaseAudioContext, s: BurstSpec) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, s.kind ?? 'white')
  const attack = s.attack ?? 0.001
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, s.t)
  g.gain.linearRampToValueAtTime(s.peak, s.t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, s.t + attack + s.decay)
  const nodes: AudioNode[] = [src]
  if (s.filter) nodes.push(filter(ctx, s.filter))
  nodes.push(g)
  if (s.pan) nodes.push(panner(ctx, s.pan))
  const last = chain(...nodes)
  last.connect(s.out)
  if (s.wet) send(ctx, last, s.wet, s.wetAmount ?? 0.3)
  const duration = Math.min(s.duration, attack + s.decay + 0.02)
  src.start(s.t, rand(0, NOISE_SECONDS - duration - 0.2), duration)
  src.onended = () => last.disconnect()
}

type ToneSpec = {
  t: number
  freq: number
  /** 音の終わりの高さ（ピッチを滑らせるとき） */
  endFreq?: number
  type?: OscillatorType
  peak: number
  attack?: number
  /** 音が消えるまでの時間 */
  decay: number
  pan?: number
  out: AudioNode
  wet?: AudioNode
  wetAmount?: number
}

/** 短い音程のある音（泡、キック、ベースなど） */
export function tone(ctx: BaseAudioContext, s: ToneSpec) {
  const osc = ctx.createOscillator()
  osc.type = s.type ?? 'sine'
  const attack = s.attack ?? 0.003
  const end = s.t + attack + s.decay
  osc.frequency.setValueAtTime(s.freq, s.t)
  if (s.endFreq) osc.frequency.exponentialRampToValueAtTime(s.endFreq, end)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, s.t)
  g.gain.linearRampToValueAtTime(s.peak, s.t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, end)
  const last = s.pan ? chain(osc, g, panner(ctx, s.pan)) : chain(osc, g)
  last.connect(s.out)
  if (s.wet) send(ctx, last, s.wet, s.wetAmount ?? 0.3)
  osc.start(s.t)
  osc.stop(end + 0.02)
  osc.onended = () => last.disconnect()
}

/* ---------- スケジューラー ---------- */
const LOOKAHEAD = 1.5
const INTERVAL_MS = 250

/**
 * 少し先の時間までの音をまとめて予約していく。
 * タブが裏にあってタイマーが遅くなっても途切れないよう、1.5秒先まで予約する。
 * OfflineAudioContext（書き出し・確認用）のときは最後まで一度に予約する。
 */
export function schedule(ctx: BaseAudioContext, tick: (from: number, to: number) => void): () => void {
  if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) {
    tick(0, ctx.length / ctx.sampleRate)
    return () => {}
  }
  let until = ctx.currentTime
  const run = () => {
    const from = Math.max(until, ctx.currentTime + 0.02)
    const to = ctx.currentTime + LOOKAHEAD
    if (to > from) {
      tick(from, to)
      until = to
    }
  }
  run()
  const id = window.setInterval(run, INTERVAL_MS)
  return () => window.clearInterval(id)
}

/** ランダムな間隔（平均 1/rate 秒）で起きる出来事。雨粒やパチッという音に使う */
export function randomEvents(rate: () => number, fire: (t: number) => void) {
  let next = -1
  const gap = () => -Math.log(1 - Math.random()) / rate()
  return (from: number, to: number) => {
    if (next < from) next = from + gap()
    while (next < to) {
      fire(next)
      next += gap()
    }
  }
}

/** 決まったリズムで起きる出来事。fire が次までの間隔(秒)を返す */
export function steps(fire: (t: number) => number, firstDelay = 0) {
  let next = -1
  return (from: number, to: number) => {
    if (next < from) next = from + firstDelay
    while (next < to) next += fire(next)
  }
}

/** 止めるときにまとめて片付ける */
export function voice(sources: AudioScheduledSourceNode[], stops: (() => void)[] = []): Voice {
  return {
    stop() {
      for (const s of stops) s()
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          // すでに止まっている
        }
        s.disconnect()
      }
    },
  }
}

/** リバーブ用の響き（だんだん小さくなるノイズ） */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
  }
  return buffer
}
