import { AIM, CLEAR_REWARD, MODIFIER, RULES } from './config'
import { advanceArena } from './physics'
import { resolveRules } from './rules'
import { shotFrom } from './shot'
import { buildStage, stageSpec, startingPlayer } from './stage'
import type { GameState, Input, RunOptions } from './types'

/**
 * CAROM 시뮬레이션.
 *
 * 결정적이다: 같은 시드 + 같은 입력열 → 같은 결과.
 * 취향이 아니라 요구사항이다. 조준선이 상태를 복제해 빨리 감는 방식으로 만들어지므로,
 * 비결정성이 섞이는 순간 "보여준 궤적"과 실제가 갈라지고 게임이 무너진다.
 *
 * 이 파일은 React, Canvas, 서버, Verse8 SDK를 전혀 모른다.
 */

/** 한 스텝 안에서만 쓰는 스크래치 버퍼. 매 스텝 비워진다. */
const contactScratch: number[] = []
const warpScratch = { warped: false, warpX: 0, warpY: 0 }

export function createStage(stageIndex: number, seed: number, opts: RunOptions): GameState {
  const spec = stageSpec(stageIndex)
  const player = startingPlayer()
  const built = buildStage(spec, player, seed | 0)

  return {
    phase: 'playing',
    spec,
    time: 0,
    timeLeft: spec.timeLimit + opts.extraSeconds,
    rngSeed: built.seed,
    player,
    bodies: built.bodies,
    portals: built.portals,
    shotsUsed: 0,
    targetsLeft: spec.targets,
    destroyed: 0,
    bestChain: 0,
    coins: 0,
    aiming: false,
    anchorX: 0,
    anchorY: 0,
    aimX: 0,
    aimY: 0,
    orderNext: 1,
    nextId: built.nextId,
    fx: [],
    usedRevive: false,
    usedConsumable: opts.extraSeconds > 0,
  }
}

export function trackOf(s: GameState): 'classic' | 'unlimited' {
  return s.usedRevive || s.usedConsumable ? 'unlimited' : 'classic'
}

export function step(state: GameState, dt: number, inputs: Input[]): GameState {
  state.fx.length = 0
  if (state.phase !== 'playing') return state

  for (const input of inputs) applyInput(state, input)

  // 제한 시간은 실제 속도로 흐른다. 조준 슬로우가 공짜가 되면 긴장이 사라진다.
  state.time += dt
  state.timeLeft -= dt

  // noSlow에서는 조준해도 물리가 느려지지 않는다. 오래 재는 것 자체가 손해가 된다.
  const slow = state.spec.modifier === 'noSlow' ? MODIFIER.noSlowFactor : AIM.slowFactor
  const simDt = state.aiming ? dt * slow : dt
  advanceArena(state.bodies, state.player, simDt, {
    contacts: contactScratch,
    portals: state.portals,
    now: state.time,
    out: warpScratch,
  })
  if (warpScratch.warped) {
    state.fx.push({ kind: 'warp', x: warpScratch.warpX, y: warpScratch.warpY, depth: 0 })
  }

  const ctx = { objective: state.spec.objective, orderNext: state.orderNext }
  const r = resolveRules(state.bodies, state.player, contactScratch, state.time, true, ctx)
  state.orderNext = ctx.orderNext
  if (r.died) {
    state.phase = 'failed'
    return state
  }
  state.targetsLeft -= r.destroyedTargets
  state.destroyed += r.destroyedTargets
  state.coins += r.coins
  state.bestChain = Math.max(state.bestChain, r.bestChain)
  for (const e of r.events) state.fx.push({ kind: e.kind, x: e.x, y: e.y, depth: e.depth })

  if (state.targetsLeft <= 0) {
    // 클리어 보상은 여기서만 준다. resolveRules는 조준선(foresight)도 함께 쓰는 코드라
    // 거기에 넣으면 아직 쏘지도 않은 예측이 코인을 세게 된다.
    state.coins += CLEAR_REWARD.base + state.spec.targets * CLEAR_REWARD.perTarget
    state.phase = 'cleared'
    return state
  }

  if (state.timeLeft <= 0) state.phase = 'failed'

  return state
}

function applyInput(state: GameState, input: Input) {
  const p = state.player
  if (input.type === 'aim') {
    state.aiming = true
    state.anchorX = input.x
    state.anchorY = input.y
    state.aimX = input.x
    state.aimY = input.y
    return
  }

  if (input.type === 'move') {
    if (!state.aiming) return
    state.aimX = input.x
    state.aimY = input.y
    return
  }

  // release
  if (!state.aiming) return
  state.aiming = false
  // 데드존 안이면 발사하지 않는다. 잘못 눌렀을 때를 위한 취소 구간.
  const shot = shotFrom(state.anchorX, state.anchorY, input.x, input.y)
  if (!shot) return

  state.shotsUsed++
  p.vx += shot.vx
  p.vy += shot.vy
  state.fx.push({ kind: 'dash', x: p.x, y: p.y, depth: 0 })

}
/** 부활: 시간을 돌려주고 위험물을 밀어낸다. 스테이지당 1회. */
export function revive(state: GameState) {
  if (state.phase !== 'failed') return
  state.phase = 'playing'
  state.usedRevive = true
  state.timeLeft += RULES.reviveSeconds
  state.player.invulnUntil = state.time + 1.5
  pushAway(state)
}

function pushAway(state: GameState) {
  const R = 190
  const p = state.player
  for (const b of state.bodies) {
    const dx = b.x - p.x
    const dy = b.y - p.y
    const d = Math.hypot(dx, dy)
    if (d > R) continue
    const nx = d > 0.001 ? dx / d : 0
    const ny = d > 0.001 ? dy / d : -1
    b.x = p.x + nx * R
    b.y = p.y + ny * R
  }
}
