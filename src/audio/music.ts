import { audioCtx, musicOut } from './engine'

/**
 * 배경음 — 파일 없이 만든다.
 *
 * 루프 파일을 쓰면 몇 MB가 붙고, 짧게 자르면 반복이 금방 들킨다.
 * 대신 **음을 골라 스케줄한다**: 낮은 패드 위에 5음계 아르페지오를 얹고,
 * 순서를 조금씩 흔들어 같은 마디가 되풀이되지 않게 한다.
 *
 * 게임 자체가 번호 하나에서 스테이지를 만들어내므로 음악도 같은 방식이 어울린다.
 *
 * CPU를 아끼려고 lookahead 스케줄러를 쓴다 — 100ms마다 깨어나
 * 앞으로 300ms 안에 울릴 음만 예약한다. rAF에 얹으면 탭이 숨을 때 음이 끊긴다.
 */

/** A 마이너 펜타토닉. 어느 두 음을 겹쳐도 안 부딪혀서 배경으로 안전하다. */
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]

const BPM = 68
const STEP = 60 / BPM / 2 // 8분음표
const LOOKAHEAD_MS = 100
const SCHEDULE_AHEAD = 0.3

let timer: number | null = null
let nextNoteAt = 0
let step = 0
let pad: { osc: OscillatorNode[]; gain: GainNode } | null = null

export function startMusic(): void {
  const c = audioCtx()
  const out = musicOut()
  if (!c || !out || timer !== null) return

  nextNoteAt = c.currentTime + 0.1
  step = 0
  startPad(c, out)

  timer = window.setInterval(() => {
    const ctx = audioCtx()
    const bus = musicOut()
    if (!ctx || !bus) return
    while (nextNoteAt < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(ctx, bus, nextNoteAt, step)
      nextNoteAt += STEP
      step++
    }
  }, LOOKAHEAD_MS)
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  const c = audioCtx()
  if (pad && c) {
    const t = c.currentTime
    pad.gain.gain.cancelScheduledValues(t)
    pad.gain.gain.setValueAtTime(pad.gain.gain.value, t)
    pad.gain.gain.linearRampToValueAtTime(0.0001, t + 0.6)
    for (const o of pad.osc) o.stop(t + 0.7)
    pad = null
  }
}

export function musicRunning(): boolean {
  return timer !== null
}

/** 낮게 깔리는 패드. 두 개를 살짝 어긋나게 튜닝해 넓게 들리게 한다. */
function startPad(c: AudioContext, out: AudioNode) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, c.currentTime)
  g.gain.linearRampToValueAtTime(0.12, c.currentTime + 2)

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 620
  lp.Q.value = 0.7

  const osc: OscillatorNode[] = []
  for (const [freq, detune] of [
    [110, -6],
    [110, 7],
    [164.81, 3],
  ] as const) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = freq
    o.detune.value = detune
    o.connect(lp)
    o.start()
    osc.push(o)
  }
  lp.connect(g).connect(out)
  pad = { osc, gain: g }
}

/**
 * 한 스텝. 매 박자마다 울리지 않는다 — 빈칸이 있어야 배경으로 남는다.
 * 16스텝 주기로 패턴이 돌되 음 선택에 흔들림을 줘서 그대로 반복되지는 않는다.
 */
function scheduleStep(c: AudioContext, out: AudioNode, when: number, i: number) {
  const bar = i % 16
  // 빈칸 패턴. 1이면 소리를 낸다.
  const hit = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0][bar]
  if (!hit) return

  // 스텝마다 결정적으로 흔든다. Math.random을 쓰면 매 세션 다르게 들려서
  // "이 게임의 소리"라는 인상이 안 남는다.
  const pick = (i * 7 + Math.floor(i / 16) * 3) % SCALE.length
  const freq = SCALE[pick]

  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.value = freq

  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.16, when + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9)

  o.connect(g).connect(out)
  o.start(when)
  o.stop(when + 0.95)
}
