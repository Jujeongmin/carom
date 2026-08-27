/**
 * CAROM 스테이지 검증.
 *   npm run sim
 *
 * 절차 생성한 스테이지가 실제로 클리어 가능한지, 그리고 난이도 곡선이
 * 의도대로 오르는지를 봇으로 측정한다.
 *
 * 손으로 레벨을 만들지 않는 대신 이 측정이 레벨 디자인을 대신한다.
 * 시뮬레이션이 결정적이기 때문에 가능한 검증이다.
 */
import { DASH, PHYSICS } from '../src/game/config'
import { createStage, step } from '../src/game/engine'
import { predict } from '../src/game/foresight'
import { shotFrom } from '../src/game/shot'
import { stageSpec } from '../src/game/stage'
import type { GameState, Input } from '../src/game/types'

const DT = PHYSICS.dt
const ANGLES = 28
const POWERS = [0.45, 0.75, 1]

/**
 * 봇: 각도 28개 × 파워 3단계를 조준선으로 돌려보고 가장 좋은 샷을 고른다.
 * 사람이 조준선을 보면서 하는 판단의 기계적 하한선이다.
 * 봇이 못 깨는 스테이지는 사람도 대체로 못 깬다.
 */
function chooseShot(s: GameState): { anchor: Input; release: Input } | null {
  const ax = s.player.x
  const ay = s.player.y
  let best: { rx: number; ry: number; score: number } | null = null

  for (let i = 0; i < ANGLES; i++) {
    const a = (i / ANGLES) * Math.PI * 2
    for (const power of POWERS) {
      // 당겨서 발사 — 쏘고 싶은 방향의 반대로 당긴다
      const pull = DASH.deadzone + (DASH.maxPull - DASH.deadzone) * power + 0.5
      const rx = ax - Math.cos(a) * pull
      const ry = ay - Math.sin(a) * pull
      const shot = shotFrom(ax, ay, rx, ry)
      if (!shot) continue

      const pred = predict(s.bodies, s.player, s.portals, shot, s.time, {
        objective: s.spec.objective,
        orderNext: s.orderNext,
      }, s.spec.aimSegments)
      let score: number
      // 폭발통은 한 방에 여러 개를 쓸어서 대시를 아낀다. 그 값어치를 점수에 반영한다.
      if (pred.destroys > 0) score = 1000 + pred.destroys * 600 - pred.hitTime * 100
      else if (pred.hitRole === 'hazard') score = -1000
      else if (pred.hitRole === 'bomb') score = 900 - pred.hitTime * 100
      else if (pred.hitRole === 'neutral') score = 200 - pred.hitTime * 20
      else score = 0

      // 타깃을 맞히더라도 경로 끝에서 죽으면 값어치가 없다.
      // 죽음이 멀수록 덜 깎는다 — 그 사이에 다음 샷으로 손쓸 수 있기 때문.
      if (pred.dies) score -= 900 - pred.dieTime * 200

      if (!best || score > best.score) best = { rx, ry, score }
    }
  }

  if (!best || best.score <= -500) return null
  return {
    anchor: { type: 'aim', x: ax, y: ay },
    release: { type: 'release', x: best.rx, y: best.ry },
  }
}

interface RunResult {
  cleared: boolean
  shotsUsed: number
  timeUsed: number
  destroyed: number
  bestChain: number
  coins: number
}

function runStage(index: number, maxSec = 120): RunResult {
  void stageSpec(index)
  const s = createStage(index, (index * 2654435761) ^ 0x5f3a, { extraSeconds: 0 })

  let sinceShot = 0
  while (s.phase === 'playing' && s.time < maxSec) {
    const inputs: Input[] = []
    sinceShot += DT
    // 매 프레임 쏘지 않는다. 공이 굴러가는 것을 지켜본 뒤 다음 샷을 고른다.
    if (sinceShot > 0.9) {
      const shot = chooseShot(s)
      if (shot) {
        inputs.push(shot.anchor, shot.release)
        sinceShot = 0
      }
    }
    step(s, DT, inputs)
  }

  return {
    cleared: s.phase === 'cleared',
    shotsUsed: s.shotsUsed,
    timeUsed: s.time,
    destroyed: s.destroyed,
    bestChain: s.bestChain,
    coins: s.coins,
  }
}

console.log("St 조건       변주       타깃 제한   결과   샷  소요   코인")
let clears = 0
const results: RunResult[] = []
const STAGES = 30
for (let i = 1; i <= STAGES; i++) {
  const spec = stageSpec(i)
  const r = runStage(i)
  results.push(r)
  if (r.cleared) clears++
  console.log(
    `${String(i).padStart(2)} ${spec.objective.padEnd(10)} ${spec.modifier.padEnd(10)} ${String(spec.targets).padStart(4)} ${String(spec.timeLimit).padStart(4)}  ${(r.cleared ? "CLEAR" : "FAIL ").padStart(6)}  ${String(r.shotsUsed).padStart(3)}  ${r.timeUsed.toFixed(1).padStart(5)}s  ${String(r.coins).padStart(5)}`,
  )
}
console.log(`\n봇 클리어율: ${clears}/${STAGES} (${Math.round((clears / STAGES) * 100)}%)`)

// 코인 수급 — 상점 가격(스킨, 이어하기)을 감으로 정하지 않기 위한 측정
const earned = results.filter((r) => r.cleared).map((r) => r.coins)
const total = earned.reduce((a, b) => a + b, 0)
const sorted = [...earned].sort((a, b) => a - b)
console.log(
  `\n클리어당 코인: 평균 ${(total / earned.length).toFixed(1)} · 중앙값 ${
    sorted[Math.floor(earned.length / 2)]
  } · 최소 ${sorted[0]} · 최대 ${sorted[sorted.length - 1]}`,
)
console.log(`${STAGES}스테이지 누적: ${total}`)

// 누적 곡선 — "몇 스테이지째에 무엇을 살 수 있는가"를 가격 정할 때 본다
let acc = 0
const cum: number[] = []
for (const r of results) {
  acc += r.coins
  cum.push(acc)
}
console.log(`\n누적 코인: ${cum.map((c, i) => `${i + 1}:${c}`).join(' ')}`)

/** 그 가격을 처음 낼 수 있게 되는 스테이지. 30스테이지 안에 못 모으면 -1. */
const reach = (price: number) => {
  const i = cum.findIndex((c) => c >= price)
  return i < 0 ? -1 : i + 1
}
const PRICES = [80, 100, 120, 150, 200, 250, 300, 350, 400, 450, 500]
console.log(`가격별 도달 스테이지: ${PRICES.map((p) => `${p}:${reach(p)}`).join(' ')}`)
