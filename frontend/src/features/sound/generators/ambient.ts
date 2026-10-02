/* =====================================================
   環境音（すべてプログラムで合成している）
   ===================================================== */
import { burst, chain, chance, filter, gain, noiseLoop, panner, pick, rand, randInt, randomEvents, schedule, send, steps, tone, voice, type Generator } from './common'

/** 雨：ザーッという雨音 + 屋根に当たる低い音 + 雨粒 */
export const rain: Generator = ({ ctx, out, wet }) => {
  const hiss = noiseLoop(ctx, 'pink')
  const hissGain = gain(ctx, 0.5)
  chain(hiss, filter(ctx, { type: 'highpass', freq: 500 }), filter(ctx, { type: 'lowpass', freq: 7000 }), hissGain, out)
  send(ctx, hissGain, wet, 0.2)

  const rumble = noiseLoop(ctx, 'brown')
  chain(rumble, filter(ctx, { type: 'lowpass', freq: 600 }), gain(ctx, 0.55), out)

  // 雨の強さがゆっくり変わる
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.06
  lfo.connect(gain(ctx, 0.12)).connect(hissGain.gain)
  lfo.start()

  const drops = randomEvents(
    () => 22,
    (t) =>
      burst(ctx, {
        t,
        duration: 0.08,
        peak: rand(0.04, 0.22),
        decay: rand(0.015, 0.05),
        filter: { type: 'bandpass', freq: rand(1500, 6000), q: rand(2, 6) },
        pan: rand(-0.8, 0.8),
        out,
        wet,
        wetAmount: 0.2,
      }),
  )
  const stop = schedule(ctx, drops)
  return voice([hiss, rumble, lfo], [stop])
}

/** 遠雷：ときどき遠くでゴロゴロ鳴る */
export const thunder: Generator = ({ ctx, out, wet }) => {
  const strike = (t: number) => {
    const near = chance(0.3)
    if (near) {
      burst(ctx, { t, duration: 0.6, peak: 0.25, attack: 0.01, decay: 0.5, filter: { type: 'lowpass', freq: 2500 }, out, wet, wetAmount: 0.6 })
    }
    const parts = randInt(3, 6)
    for (let i = 0; i < parts; i++) {
      burst(ctx, {
        t: t + (near ? 0.05 : 0.3) + rand(0, 2.5),
        kind: 'brown',
        duration: 6,
        peak: rand(0.5, 1.2),
        attack: rand(0.08, 0.5),
        decay: rand(1.5, 4),
        filter: { type: 'lowpass', freq: rand(120, 380) },
        pan: rand(-0.5, 0.5),
        out,
        wet,
        wetAmount: 0.7,
      })
    }
    return rand(16, 40)
  }
  const stop = schedule(ctx, steps(strike, rand(1, 3)))
  return voice([], [stop])
}

/** 焚き火：ゴーッという炎 + パチパチ */
export const fire: Generator = ({ ctx, out, wet }) => {
  const roar = noiseLoop(ctx, 'brown')
  const roarGain = gain(ctx, 0.6)
  chain(roar, filter(ctx, { type: 'lowpass', freq: 240 }), roarGain, out)

  const hiss = noiseLoop(ctx, 'pink')
  chain(hiss, filter(ctx, { type: 'bandpass', freq: 3000, q: 0.6 }), gain(ctx, 0.05), out)

  // 炎のゆらぎ
  const flicker = steps((t) => {
    const gap = rand(0.3, 1.2)
    roarGain.gain.linearRampToValueAtTime(rand(0.4, 0.8), t + gap)
    return gap
  })
  const crackle = randomEvents(
    () => 7,
    (t) => {
      const count = chance(0.25) ? randInt(2, 5) : 1
      let tt = t
      for (let i = 0; i < count; i++) {
        burst(ctx, {
          t: tt,
          duration: 0.03,
          peak: Math.pow(rand(0.3, 1), 2) * 0.8,
          decay: rand(0.004, 0.02),
          filter: { type: 'highpass', freq: rand(1200, 4500) },
          pan: rand(-0.5, 0.5),
          out,
          wet,
          wetAmount: 0.15,
        })
        tt += rand(0.006, 0.05)
      }
    },
  )
  // ときどき大きめに「パン」とはじける
  const pop = randomEvents(
    () => 0.35,
    (t) =>
      burst(ctx, { t, duration: 0.1, peak: 0.6, decay: 0.05, filter: { type: 'bandpass', freq: rand(400, 1200), q: 1.5 }, pan: rand(-0.4, 0.4), out, wet, wetAmount: 0.2 }),
  )
  const stop = schedule(ctx, (from, to) => {
    flicker(from, to)
    crackle(from, to)
    pop(from, to)
  })
  return voice([roar, hiss], [stop])
}

/** 波：寄せては返す波 + 泡のシュワッ + 低いうなり */
export const waves: Generator = ({ ctx, out, wet }) => {
  const sea = noiseLoop(ctx, 'pink')
  const lp = filter(ctx, { type: 'lowpass', freq: 400, q: 0.5 })
  const seaGain = gain(ctx, 0.15)
  chain(sea, lp, seaGain, out)
  send(ctx, seaGain, wet, 0.3)

  const foam = noiseLoop(ctx, 'white')
  const foamGain = gain(ctx, 0)
  chain(foam, filter(ctx, { type: 'highpass', freq: 2500 }), foamGain, out)
  send(ctx, foamGain, wet, 0.3)

  const rumble = noiseLoop(ctx, 'brown')
  chain(rumble, filter(ctx, { type: 'lowpass', freq: 200 }), gain(ctx, 0.35), out)

  const wave = steps((t) => {
    const period = rand(7, 11)
    const crest = t + period * rand(0.35, 0.5)
    const peak = rand(0.6, 1)
    seaGain.gain.linearRampToValueAtTime(0.12, t)
    seaGain.gain.linearRampToValueAtTime(peak, crest)
    lp.frequency.exponentialRampToValueAtTime(rand(350, 450), t)
    lp.frequency.exponentialRampToValueAtTime(rand(1400, 2200), crest)
    foamGain.gain.linearRampToValueAtTime(0, crest - 0.3)
    foamGain.gain.linearRampToValueAtTime(peak * 0.12, crest + 0.5)
    foamGain.gain.linearRampToValueAtTime(0, t + period)
    return period
  })
  const stop = schedule(ctx, wave)
  return voice([sea, foam, rumble], [stop])
}

/** 小川：さらさら流れる水 + ポコポコした泡 */
export const stream: Generator = ({ ctx, out, wet }) => {
  const high = noiseLoop(ctx, 'white')
  const highGain = gain(ctx, 0.15)
  chain(high, filter(ctx, { type: 'bandpass', freq: 1400, q: 0.7 }), highGain, out)

  const low = noiseLoop(ctx, 'pink')
  const lowGain = gain(ctx, 0.3)
  chain(low, filter(ctx, { type: 'bandpass', freq: 500, q: 0.8 }), lowGain, out)

  const flow = steps((t) => {
    const gap = rand(0.5, 1.5)
    highGain.gain.linearRampToValueAtTime(rand(0.1, 0.2), t + gap)
    lowGain.gain.linearRampToValueAtTime(rand(0.22, 0.38), t + gap)
    return gap
  })
  const bubbles = randomEvents(
    () => 20,
    (t) => {
      const f = rand(500, 1400)
      tone(ctx, { t, freq: f, endFreq: f * rand(1.6, 2.6), peak: rand(0.02, 0.09), attack: 0.004, decay: rand(0.02, 0.07), pan: rand(-0.7, 0.7), out, wet, wetAmount: 0.15 })
    },
  )
  const stop = schedule(ctx, (from, to) => {
    flow(from, to)
    bubbles(from, to)
  })
  return voice([high, low], [stop])
}

/** 風：強くなったり弱くなったりする風 + ヒューという音 */
export const wind: Generator = ({ ctx, out, wet }) => {
  const air = noiseLoop(ctx, 'pink')
  const bp = filter(ctx, { type: 'bandpass', freq: 500, q: 0.9 })
  const airGain = gain(ctx, 0.5)
  chain(air, bp, airGain, out)
  send(ctx, airGain, wet, 0.2)

  const body = noiseLoop(ctx, 'brown')
  chain(body, filter(ctx, { type: 'lowpass', freq: 160 }), gain(ctx, 0.4), out)

  const whistle = noiseLoop(ctx, 'white')
  const wbp = filter(ctx, { type: 'bandpass', freq: 900, q: 18 })
  const wGain = gain(ctx, 0)
  const wPan = panner(ctx, 0)
  chain(whistle, wbp, wGain, wPan, out)
  send(ctx, wPan, wet, 0.4)

  const gust = steps((t) => {
    const gap = rand(2, 5)
    bp.frequency.exponentialRampToValueAtTime(rand(280, 900), t + gap)
    airGain.gain.linearRampToValueAtTime(rand(0.25, 1), t + gap)
    wbp.frequency.exponentialRampToValueAtTime(rand(700, 1500), t + gap)
    wGain.gain.linearRampToValueAtTime(rand(0, 0.5), t + gap)
    wPan.pan.linearRampToValueAtTime(rand(-0.6, 0.6), t + gap)
    return gap
  })
  const stop = schedule(ctx, gust)
  return voice([air, body, whistle], [stop])
}

/** 小鳥：いろいろな鳴き方の小鳥がときどき鳴く */
export const birds: Generator = ({ ctx, out, wet }) => {
  const air = noiseLoop(ctx, 'pink')
  chain(air, filter(ctx, { type: 'highpass', freq: 2500 }), gain(ctx, 0.03), out)

  const leaves = noiseLoop(ctx, 'pink')
  chain(leaves, filter(ctx, { type: 'bandpass', freq: 800, q: 0.6 }), gain(ctx, 0.04), out)

  /** ピピッ、チチッ */
  const chirps = (t: number, dest: AudioNode) => {
    const f0 = rand(2600, 3800)
    const n = randInt(3, 6)
    let tt = t
    for (let i = 0; i < n; i++) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const dur = rand(0.05, 0.09)
      const f = f0 * rand(0.95, 1.05)
      osc.frequency.setValueAtTime(f, tt)
      osc.frequency.exponentialRampToValueAtTime(f * rand(1.2, 1.5), tt + dur * 0.6)
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, tt + dur)
      g.gain.setValueAtTime(0, tt)
      g.gain.linearRampToValueAtTime(rand(0.05, 0.1), tt + 0.01)
      g.gain.linearRampToValueAtTime(0, tt + dur)
      chain(osc, g, dest)
      osc.start(tt)
      osc.stop(tt + dur + 0.02)
      osc.onended = () => g.disconnect()
      tt += rand(0.1, 0.16)
    }
  }
  /** ルルルル…というさえずり */
  const trill = (t: number, dest: AudioNode) => {
    const f0 = rand(3000, 4500)
    const dur = rand(0.6, 1.2)
    const osc = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const depth = gain(ctx, f0 * 0.12)
    const g = ctx.createGain()
    osc.frequency.value = f0
    mod.frequency.value = rand(18, 30)
    mod.connect(depth).connect(osc.frequency)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(rand(0.03, 0.06), t + 0.08)
    g.gain.linearRampToValueAtTime(0, t + dur)
    chain(osc, g, dest)
    osc.start(t)
    mod.start(t)
    osc.stop(t + dur + 0.05)
    mod.stop(t + dur + 0.05)
    osc.onended = () => g.disconnect()
  }
  /** ピーヒョロ…とのびやかに鳴く */
  const whistleSong = (t: number, dest: AudioNode) => {
    const f0 = rand(2000, 3200)
    const notes = [f0, f0 * rand(0.75, 0.85), ...(chance(0.5) ? [f0 * rand(1.05, 1.15)] : [])]
    let tt = t
    for (const f of notes) {
      const dur = rand(0.25, 0.4)
      const osc = ctx.createOscillator()
      const vib = ctx.createOscillator()
      const g = ctx.createGain()
      osc.frequency.value = f
      vib.frequency.value = 6
      vib.connect(gain(ctx, 18)).connect(osc.frequency)
      g.gain.setValueAtTime(0, tt)
      g.gain.linearRampToValueAtTime(rand(0.04, 0.07), tt + 0.06)
      g.gain.linearRampToValueAtTime(0, tt + dur)
      chain(osc, g, dest)
      osc.start(tt)
      vib.start(tt)
      osc.stop(tt + dur + 0.02)
      vib.stop(tt + dur + 0.02)
      osc.onended = () => g.disconnect()
      tt += dur + rand(0.05, 0.15)
    }
  }

  // 鳥のいる場所（左・左寄り・右寄り・右）
  const spots = [-0.75, -0.3, 0.3, 0.75].map((pan) => {
    const p = panner(ctx, pan)
    p.connect(out)
    send(ctx, p, wet, 0.6)
    return p
  })

  const song = steps((t) => {
    const p = pick(spots)
    const r = Math.random()
    if (r < 0.5) chirps(t, p)
    else if (r < 0.75) trill(t, p)
    else whistleSong(t, p)
    return rand(1.2, 4.5)
  }, rand(0.3, 1))
  const stop = schedule(ctx, song)
  return voice([air, leaves], [stop])
}

/** 夜の虫：リーンリーンと鳴くコオロギたち */
export const insects: Generator = ({ ctx, out, wet }) => {
  const night = noiseLoop(ctx, 'brown')
  chain(night, filter(ctx, { type: 'lowpass', freq: 400 }), gain(ctx, 0.12), out)

  const crickets = Array.from({ length: 4 }, () => {
    const osc = ctx.createOscillator()
    osc.frequency.value = rand(4200, 5200)
    const g = gain(ctx, 0)
    const p = panner(ctx, rand(-0.8, 0.8))
    chain(osc, g, p, out)
    send(ctx, p, wet, 0.35)
    osc.start()
    const level = rand(0.04, 0.1)
    const period = rand(0.7, 1.2)
    const pulses = randInt(3, 4)
    const chirp = steps((t) => {
      if (!chance(0.15)) {
        for (let i = 0; i < pulses; i++) {
          const tp = t + i * 0.048
          g.gain.setValueAtTime(0, tp)
          g.gain.linearRampToValueAtTime(level, tp + 0.004)
          g.gain.linearRampToValueAtTime(level * 0.8, tp + 0.012)
          g.gain.linearRampToValueAtTime(0, tp + 0.016)
        }
      }
      return period * rand(0.95, 1.05)
    }, rand(0, 1))
    return { osc, chirp }
  })
  const stop = schedule(ctx, (from, to) => crickets.forEach((c) => c.chirp(from, to)))
  return voice([night, ...crickets.map((c) => c.osc)], [stop])
}
