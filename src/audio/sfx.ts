import { audioCtx, noiseBuffer, sfxOut } from './engine'

/**
 * 효과음 — 전부 그 자리에서 합성한다.
 *
 * 당구 게임이라 **접촉음이 제일 중요하다.** 공이 닿았는데 소리가 없으면
 * 화면만 움직이고 손맛이 없다. 그래서 tock 계열을 짧고 또렷하게 만든다
 * (10~60ms). 길면 연쇄가 일어날 때 소리가 겹쳐 진흙이 된다.
 *
 * 모든 함수는 실패해도 던지지 않는다. 소리 때문에 게임이 멈추면 안 된다.
 */

export type SfxName =
  | 'shot'
  | 'hitBody'
  | 'hitWall'
  | 'destroy'
  | 'chain'
  | 'explode'
  | 'warp'
  | 'clear'
  | 'fail'
  | 'coin'
  | 'ui'

/** 동시에 너무 많이 울리면 찢어진다. 한 프레임에 나는 소리 수를 제한한다. */
let playedThisFrame = 0
export function resetSfxFrame(): void {
  playedThisFrame = 0
}
const MAX_PER_FRAME = 4

export function playSfx(name: SfxName, opts: { depth?: number } = {}): void {
  const c = audioCtx()
  const out = sfxOut()
  if (!c || !out || out.gain.value <= 0) return
  if (playedThisFrame >= MAX_PER_FRAME) return
  playedThisFrame++

  /*
    컨텍스트가 아직 suspended면 currentTime이 멈춰 있다. 그 시각에 예약하면
    resume되는 순간 밀린 소리가 한꺼번에 터지거나 그냥 사라진다.
    첫 클릭이 묵음이던 것이 이 경우다 — resume()은 비동기라 방금 만든
    컨텍스트는 아직 running이 아니다. 풀린 뒤에 낸다.
  */
  if (c.state !== 'running') {
    void c.resume().then(() => emit(c, out, name, opts, c.currentTime)).catch(() => {})
    return
  }

  emit(c, out, name, opts, c.currentTime)
}

function emit(
  c: AudioContext,
  out: GainNode,
  name: SfxName,
  opts: { depth?: number },
  t: number,
): void {
  try {
    switch (name) {
      case 'shot':
        return shot(c, out, t)
      case 'hitBody':
        return tock(c, out, t, 620, 0.055, 0.5)
      case 'hitWall':
        return tock(c, out, t, 300, 0.05, 0.32)
      case 'destroy':
        return bell(c, out, t, 880, 0.34)
      case 'chain':
        // 연쇄가 깊어질수록 음이 올라간다. 몇 번째인지 귀로 세어진다.
        return bell(c, out, t, 880 * Math.pow(1.26, Math.min(opts.depth ?? 1, 6)), 0.3)
      case 'explode':
        return explode(c, out, t)
      case 'warp':
        return warp(c, out, t)
      case 'clear':
        // 마지막 음만 길게 남긴다. 앞 세 음까지 길면 서로 겹쳐 뭉갠다.
        return arp(c, out, t, [523.25, 659.25, 783.99, 1046.5], 0.13, 0.18, 0.5)
      case 'fail':
        return arp(c, out, t, [392, 311.13, 233.08], 0.16, 0.22)
      case 'coin':
        return arp(c, out, t, [1046.5, 1396.9], 0.06, 0.14)
      case 'ui':
        return tock(c, out, t, 1200, 0.028, 0.22)
    }
  } catch {
    // 무시. 소리 하나 못 낸 것으로 게임을 멈추지 않는다.
  }
}

/** 짧은 감쇠 엔벨로프. Web Audio에는 이게 없어서 매번 손으로 건다. */
function env(g: GainNode, t: number, peak: number, dur: number, attack = 0.004) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

/** 당구공이 부딪히는 소리. 필터 건 노이즈 + 짧은 사인 = 나무/유리 중간 톤. */
function tock(c: AudioContext, out: AudioNode, t: number, freq: number, dur: number, peak: number) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)

  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 6

  const g = c.createGain()
  env(g, t, peak, dur, 0.002)

  src.connect(bp).connect(g).connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)

  // 노이즈만 쓰면 "치익"이 된다. 사인을 겹쳐 음정을 준다.
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq * 1.4, t)
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur)
  const og = c.createGain()
  env(og, t, peak * 0.7, dur, 0.002)
  o.connect(og).connect(out)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** 발사. 아래로 훑는 소리 — 힘이 실려 나간다는 느낌. */
function shot(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(760, t)
  o.frequency.exponentialRampToValueAtTime(180, t + 0.16)

  const g = c.createGain()
  env(g, t, 0.42, 0.18)

  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.2)
}

/** 파괴. 맑은 종소리 — 잘한 일이라는 신호. */
function bell(c: AudioContext, out: AudioNode, t: number, freq: number, dur: number) {
  for (const [mul, amp] of [
    [1, 0.32],
    [2.01, 0.16],
    [3.02, 0.08],
  ] as const) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq * mul
    const g = c.createGain()
    env(g, t, amp, dur)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
}

/** 폭발. 저음이 뚝 떨어지고 노이즈가 깔린다. */
function explode(c: AudioContext, out: AudioNode, t: number) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(2400, t)
  lp.frequency.exponentialRampToValueAtTime(240, t + 0.4)
  const g = c.createGain()
  env(g, t, 0.5, 0.42, 0.006)
  src.connect(lp).connect(g).connect(out)
  src.start(t)
  src.stop(t + 0.45)

  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(160, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.35)
  const og = c.createGain()
  env(og, t, 0.55, 0.38, 0.006)
  o.connect(og).connect(out)
  o.start(t)
  o.stop(t + 0.4)
}

/** 포탈. 위로 훑는 소리 — 어딘가로 빨려 들어간다. */
function warp(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(200, t)
  o.frequency.exponentialRampToValueAtTime(1500, t + 0.22)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900
  bp.Q.value = 3
  const g = c.createGain()
  env(g, t, 0.3, 0.24)
  o.connect(bp).connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.26)
}

/**
 * 짧은 아르페지오. 클리어·실패·코인처럼 결과를 알리는 자리에 쓴다.
 *
 * 음 길이(dur)는 간격(step)보다 조금만 길게 잡는다. 많이 길면 음이 여러 개
 * 동시에 울려 진폭이 더해지고 소리가 뭉개진다 — 클리어음이 그래서 이상했다.
 * 마지막 음만 tailDur로 길게 남겨 끝맺음을 준다.
 */
function arp(
  c: AudioContext,
  out: AudioNode,
  t: number,
  notes: number[],
  step: number,
  dur = 0.2,
  tailDur = dur,
) {
  notes.forEach((f, i) => {
    const at = t + i * step
    const last = i === notes.length - 1
    const length = last ? tailDur : dur
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    const g = c.createGain()
    env(g, at, last ? 0.3 : 0.22, length)
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + length + 0.04)
  })
}
