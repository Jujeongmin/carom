/**
 * 오디오 기반부.
 *
 * 소리는 **파일이 아니라 합성**이다. 이 게임은 스테이지를 번호 하나에서 만들어내는데
 * 소리만 몇 MB짜리 에셋으로 들고 오면 앞뒤가 안 맞고, 다운로드도 그만큼 늘어난다.
 * Web Audio로 만들면 용량이 0이고 톤도 네온 사이파이에 그대로 맞출 수 있다.
 *
 * 브라우저는 사용자 제스처 없이 소리를 못 낸다. 그래서 AudioContext를 미리 만들지 않고
 * 첫 입력에서 만든다 — 미리 만들면 suspended 상태로 굳어 아무 소리도 안 난다.
 */

const KEY = 'carom.audio.v1'

export interface Volumes {
  /** 배경음 0..1 */
  music: number
  /** 효과음 0..1 */
  sfx: number
}

const DEFAULTS: Volumes = { music: 0.4, sfx: 0.7 }

function load(): Volumes {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const v = JSON.parse(raw) as Partial<Volumes>
    return {
      music: clamp01(v.music ?? DEFAULTS.music),
      sfx: clamp01(v.sfx ?? DEFAULTS.sfx),
    }
  } catch {
    // 저장소가 막혀 있어도 소리는 나야 한다
    return { ...DEFAULTS }
  }
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}

let volumes = load()
const listeners = new Set<() => void>()

let ctx: AudioContext | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null

/**
 * 오디오를 켠다. **반드시 사용자 제스처 안에서** 불러야 한다.
 * 여러 번 불러도 안전하다 — 이미 있으면 suspended만 풀어준다.
 */
export function ensureAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()

      /*
        효과음 뒤에 리미터를 둔다.

        연쇄나 폭발이 터지면 소리가 한꺼번에 겹친다. 진폭은 그냥 더해지므로
        합이 1을 넘으면 그 순간 파형이 잘려 "지직"거린다 — 실제로 클리어 순간에
        그 일이 났다. 화음 하나하나의 크기를 아무리 맞춰도 몇 개가 겹칠지는
        플레이에 달려 있어서, 한 곳에서 눌러주는 편이 확실하다.
      */
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -10
      limiter.knee.value = 6
      limiter.ratio.value = 12
      limiter.attack.value = 0.003
      limiter.release.value = 0.12

      sfxBus = ctx.createGain()
      musicBus = ctx.createGain()
      sfxBus.connect(limiter).connect(ctx.destination)
      musicBus.connect(ctx.destination)
      applyVolumes()
    }
    // 탭을 벗어났다 돌아오면 suspended로 남아 있다.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    // 오디오가 막힌 환경. 게임은 그대로 돌아가야 한다.
    return null
  }
}

/** 이미 켜져 있으면 그 컨텍스트, 아니면 null. 제스처 밖에서 쓰는 조회용. */
export function audioCtx(): AudioContext | null {
  return ctx
}

export function sfxOut(): GainNode | null {
  return sfxBus
}

export function musicOut(): GainNode | null {
  return musicBus
}

function applyVolumes() {
  // 사람 귀는 진폭이 아니라 로그로 듣는다. 슬라이더를 선형으로 두면
  // 위쪽 절반이 거의 안 변하고 아래쪽에서만 뚝 떨어진다.
  if (sfxBus) sfxBus.gain.value = curve(volumes.sfx)
  if (musicBus) musicBus.gain.value = curve(volumes.music) * 0.55
}

function curve(v: number): number {
  return v <= 0 ? 0 : v * v
}

export function getVolumes(): Volumes {
  return volumes
}

export function setVolume(kind: keyof Volumes, value: number): void {
  volumes = { ...volumes, [kind]: clamp01(value) }
  applyVolumes()
  try {
    localStorage.setItem(KEY, JSON.stringify(volumes))
  } catch {
    // 저장 실패로 조절을 막지 않는다. 이번 세션에는 적용된다.
  }
  for (const fn of listeners) fn()
}

export function subscribeVolumes(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 짧은 노이즈 버스트용 버퍼. 매번 만들면 GC가 돈다. */
let noise: AudioBuffer | null = null

export function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise
  const len = Math.floor(c.sampleRate * 0.4)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  noise = buf
  return buf
}
