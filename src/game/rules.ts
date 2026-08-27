import { BOMB, CHAIN } from './config'
import { inContact } from './physics'
import type { Body, Objective, Player } from './types'

/**
 * 게임 규칙(파괴·폭발·연쇄)의 유일한 구현.
 *
 * 엔진과 조준선이 **반드시 이 함수 하나만** 호출한다.
 * 규칙이 두 벌 있으면 조준선이 보여준 결과와 실제가 갈라지고, 그 순간 이 게임은
 * 성립하지 않는다. 실제로 그 사고를 한 번 냈기 때문에 여기에 몰아둔다.
 */

export interface RuleEvent {
  kind: 'destroy' | 'chain' | 'explode'
  x: number
  y: number
  depth: number
}

export interface RuleContext {
  objective: Objective
  /** inOrder에서 다음 부술 번호. 파괴가 일어나면 갱신된다. */
  orderNext: number
}

export interface RuleResult {
  /** 실패했는가 (위험물 접촉, 또는 클리어 조건 위반) */
  died: boolean
  /** 이번 스텝에 사라진 타깃 수 */
  destroyedTargets: number
  /** 연쇄로 얻은 코인 */
  coins: number
  /** 이번 스텝의 최고 연쇄 깊이 */
  bestChain: number
  events: RuleEvent[]
}

const EMPTY: RuleEvent[] = []

export function resolveRules(
  bodies: Body[],
  player: Player,
  contacts: number[],
  now: number,
  collectEvents: boolean,
  ctx: RuleContext,
): RuleResult {
  const result: RuleResult = {
    died: false,
    destroyedTargets: 0,
    coins: 0,
    bestChain: 0,
    events: collectEvents ? [] : EMPTY,
  }

  const doomed = new Set<number>()
  const bombQueue: Body[] = []

  const push = (e: RuleEvent) => {
    if (collectEvents) result.events.push(e)
  }

  // 1) 플레이어가 직접 친 것
  for (const id of contacts) {
    const b = bodies.find((x) => x.id === id)
    if (!b) continue

    if (b.role === 'hazard') {
      if (now >= player.invulnUntil) {
        result.died = true
        return result
      }
      continue
    }
    if (b.role === 'target') {
      // carom — 큐볼로 직접 부술 수 없다. 튕기기만 한다.
      if (ctx.objective === 'bankShot') continue
      if (!doomed.has(b.id)) {
        if (!canDestroy(ctx, b)) continue
        doomed.add(b.id)
        result.bestChain = Math.max(result.bestChain, 1)
        push({ kind: 'destroy', x: b.x, y: b.y, depth: 1 })
      }
    } else if (b.role === 'bomb') {
      if (!doomed.has(b.id)) {
        doomed.add(b.id)
        bombQueue.push(b)
      }
    } else if (b.role === 'neutral') {
      // noNeutral — 각을 만들던 공이 지뢰가 된다
      if (ctx.objective === 'noNeutral' && now >= player.invulnUntil) {
        result.died = true
        return result
      }
      b.chargedAt = now
      b.depthTag = 1
    }
    // wall — 튕기기만 한다. 죽지도, 부서지지도, 충전되지도 않는다.
  }

  // 2) 충전된 중립구가 친 것 — 당구의 쿠션·연쇄
  for (const a of bodies) {
    if (a.role !== 'neutral') continue
    if (a.chargedAt < 0 || now - a.chargedAt > CHAIN.windowSec) continue

    for (const b of bodies) {
      if (a === b) continue
      if (!inContact(a.x, a.y, a.r, b.x, b.y, b.r)) continue
      const depth = (a.depthTag ?? 1) + 1

      if (b.role === 'target' && !doomed.has(b.id)) {
        if (!canDestroy(ctx, b)) continue
        doomed.add(b.id)
        result.bestChain = Math.max(result.bestChain, depth)
        result.coins += depth * CHAIN.coinPerDepth
        push({ kind: 'chain', x: b.x, y: b.y, depth })
      } else if (b.role === 'bomb' && !doomed.has(b.id)) {
        doomed.add(b.id)
        bombQueue.push(b)
      } else if (b.role === 'neutral') {
        const charged = b.chargedAt >= 0 && now - b.chargedAt <= CHAIN.windowSec
        if (!charged) {
          b.chargedAt = now
          b.depthTag = depth
        }
      }
    }
  }

  // 3) 폭발 — 반경 안 타깃을 쓸고, 다른 폭발통을 연쇄시킨다.
  //    위험물은 폭발로 없어지지 않는다. 그래야 위험물이 끝까지 위협으로 남는다.
  while (bombQueue.length) {
    const bomb = bombQueue.shift()!
    let swept = 0

    for (const b of bodies) {
      if (doomed.has(b.id)) continue
      const d = Math.hypot(b.x - bomb.x, b.y - bomb.y)
      if (d > BOMB.radius + b.r) continue

      if (b.role === 'target') {
        doomed.add(b.id)
        swept++
      } else if (b.role === 'bomb') {
        doomed.add(b.id)
        bombQueue.push(b)
      }
    }

    // 폭발은 주변을 물리적으로 밀어낸다. 판이 흔들리면서 다음 샷의 각이 바뀐다.
    for (const b of bodies) {
      if (doomed.has(b.id) || b.invMass === 0) continue
      const dx = b.x - bomb.x
      const dy = b.y - bomb.y
      const d = Math.hypot(dx, dy)
      if (d > BOMB.radius * 1.4 || d < 0.001) continue
      const push2 = BOMB.impulse * (1 - d / (BOMB.radius * 1.4)) * b.invMass
      b.vx += (dx / d) * push2
      b.vy += (dy / d) * push2
    }

    result.coins += swept * BOMB.coinPerTarget
    result.bestChain = Math.max(result.bestChain, swept)
    push({ kind: 'explode', x: bomb.x, y: bomb.y, depth: swept })
  }

  if (doomed.size) {
    for (let i = bodies.length - 1; i >= 0; i--) {
      if (!doomed.has(bodies[i].id)) continue
      if (bodies[i].role === 'target') result.destroyedTargets++
      bodies.splice(i, 1)
    }
  }

  return result
}

/**
 * inOrder에서 이 타깃을 지금 부술 수 있는가.
 *
 * 순서를 어기면 실패시키지 않고 그냥 안 부순다.
 * 공이 멈추지 않는 게임에서 "잘못 건드리면 즉사"는 조준선 사정거리 밖의 사고로 지는 것이라
 * 플레이어가 배울 수가 없다. 못 부수는 것만으로도 순서를 계획할 이유는 충분하다.
 */
function canDestroy(ctx: RuleContext, b: Body): boolean {
  if (ctx.objective !== 'inOrder') return true
  if (b.order === undefined) return true
  if (b.order !== ctx.orderNext) return false
  ctx.orderNext++
  return true
}
