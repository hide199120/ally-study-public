import { SOUND_BY_ID, type SoundId } from './catalog'
import { GENERATORS } from './generators'
import { makeImpulse, type Voice } from './generators/common'

type Track = { dry: GainNode; wet: GainNode; voice: Voice }

export type TrackTarget = { id: SoundId; playing: boolean; volume: number }

const FADE_IN = 1.5
const FADE_OUT = 0.8

/** スライダーの値(0〜1)を実際の音量に変換する（耳の感じ方に合わせて2乗する） */
const gainFor = (id: SoundId, volume: number) => SOUND_BY_ID[id].level * volume * volume

/**
 * Web Audio API で音を鳴らす部分。React や Redux とは切り離し、
 * 「どの音をどの音量で鳴らすか」を sync() で受け取って、その状態に合わせる。
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private tracks = new Map<SoundId, Track>()

  private get supported() {
    return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined'
  }

  private ensure() {
    if (this.ctx && this.master && this.reverb) return { ctx: this.ctx, master: this.master, reverb: this.reverb }
    const ctx = new AudioContext()
    // 全体の音量 → 音割れ防止のコンプレッサー → スピーカー
    const master = ctx.createGain()
    master.gain.value = 0.9
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.knee.value = 8
    limiter.ratio.value = 6
    master.connect(limiter).connect(ctx.destination)
    // 響き（部屋や森の空気感）を足すためのリバーブ
    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(ctx, 2.8, 2.6)
    const reverbOut = ctx.createGain()
    reverbOut.gain.value = 0.55
    reverb.connect(reverbOut).connect(master)
    this.ctx = ctx
    this.master = master
    this.reverb = reverb
    return { ctx, master, reverb }
  }

  /** クリックなどのユーザー操作の中で呼び、ブラウザの自動再生ブロックを解除する */
  unlock() {
    if (!this.supported) return
    const { ctx } = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  /** 渡された状態に合わせて、音を鳴らしたり止めたり音量を変えたりする */
  sync(targets: TrackTarget[]) {
    if (!this.supported) return
    for (const { id, playing, volume } of targets) {
      const track = this.tracks.get(id)
      if (playing && !track) this.start(id, volume)
      else if (!playing && track) this.stop(id, track)
      else if (playing && track) this.setVolume(id, track, volume)
    }
  }

  private start(id: SoundId, volume: number) {
    const { ctx, master, reverb } = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const target = gainFor(id, volume)
    const dry = ctx.createGain()
    const wet = ctx.createGain()
    for (const g of [dry, wet]) {
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(target, now + FADE_IN)
    }
    dry.connect(master)
    wet.connect(reverb)
    const voice = GENERATORS[id]({ ctx, out: dry, wet })
    this.tracks.set(id, { dry, wet, voice })
  }

  private stop(id: SoundId, track: Track) {
    const ctx = this.ctx
    this.tracks.delete(id)
    if (!ctx) return
    const now = ctx.currentTime
    for (const g of [track.dry, track.wet]) {
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(0, now + FADE_OUT)
    }
    window.setTimeout(() => {
      track.voice.stop()
      track.dry.disconnect()
      track.wet.disconnect()
    }, FADE_OUT * 1000 + 100)
  }

  private setVolume(id: SoundId, track: Track, volume: number) {
    const ctx = this.ctx
    if (!ctx) return
    const target = gainFor(id, volume)
    for (const g of [track.dry, track.wet]) {
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.setTargetAtTime(target, ctx.currentTime, 0.08)
    }
  }
}

export const soundEngine = new SoundEngine()
