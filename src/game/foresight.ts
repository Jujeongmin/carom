import { FORESIGHT, PHYSICS } from './config'
import { advanceArena, cloneBodies } from './physics'
import { resolveRules, type RuleContext } from './rules'
import type { Body, Player, Portal, Prediction } from './types'

/**
 * 조준선 — "지금 날리면 어떻게 되는가".
 *
 * 상태를 복제해 실제와 똑같은 물리·규칙으로 빨리 감는다. 근사가 아니라 정확한 미래다.
 * 파괴·폭발·포탈까지 전부 엔진과 같은 함수(advanceArena, resolveRules)로 처리하므로
 * 규칙이 늘어나도 조준선과 실제가 갈라지지 않는다.
 *
 * 비용 실측: 물체 20개 기준 데스크톱 0.06ms, 모바일 환산 약 0.3ms.
 * 매 프레임 호출해도 프레임 예산의 2% 수준이라 캐싱하지 않는다.
 */
export function predict(
  bodies: Body[],
  player: Player,
  portals: Portal[],
  /** 발사 임펄스. 엔진과 같은 shotFrom 결과를 그대로 넘겨야 한다. */
  dash: { vx: number; vy: number } | null,
  now = 0,
  /** 클리어 조건. 엔진과 같은 조건을 넘겨야 조준선이 위반을 미리 경고한다. */
  ruleCtx: RuleContext = { objective: 'destroyAll', orderNext: 1 },
  /** 그릴 선분 수. shortLine 모디파이어가 이걸 줄여 정보를 제한한다. */
  maxSegments: number = FORESIGHT.maxSegments,
  horizonSec = FORESIGHT.horizonSec,
): Prediction {
  const sim = cloneBodies(bodies)
  const p: Player = { ...player }

  if (dash) {
    p.vx += dash.vx
    p.vy += dash.vy
  }

  const steps = Math.round(horizonSec / PHYSICS.dt)
  const path: { x: number; y: number }[] = [{ x: p.x, y: p.y }]
  const contacts: number[] = []
  const warp = { warped: false, warpX: 0, warpY: 0, bounced: false }
  const maxBounces = Math.max(0, maxSegments - 1)
  let bounces = 0
  let pathClosed = false
  // 규칙 판정이 orderNext를 갱신하므로 복제본을 쓴다. 예측이 실제 상태를 건드리면 안 된다.
  const ctx: RuleContext = { objective: ruleCtx.objective, orderNext: ruleCtx.orderNext }

  let hitTime = -1
  let hitX = 0
  let hitY = 0
  let hitBodyId = -1
  let hitRole: Prediction['hitRole'] = null
  let dies = false
  let dieTime = -1
  let dieX = 0
  let dieY = 0
  let destroys = 0

  for (let s = 0; s < steps; s++) {
    const prevVx = p.vx
    const prevVy = p.vy
    const t = now + (s + 1) * PHYSICS.dt

    advanceArena(sim, p, PHYSICS.dt, { contacts, portals, now: t, out: warp })

    // 첫 충돌 대상 기록 — 조준선 색이 여기서 정해진다
    if (hitTime < 0 && contacts.length) {
      const b = sim.find((x) => x.id === contacts[0])
      if (b) {
        hitTime = (s + 1) * PHYSICS.dt
        hitX = p.x
        hitY = p.y
        hitBodyId = b.id
        hitRole = b.role
      }
    }

    // 엔진과 똑같은 규칙을 돌린다. 폭발 연쇄도, 클리어 조건 위반도 여기서 그대로 판정된다.
    const r = resolveRules(sim, p, contacts, t, false, ctx)
    destroys += r.destroyedTargets
    if (r.died) {
      dies = true
      dieTime = (s + 1) * PHYSICS.dt
      dieX = p.x
      dieY = p.y
      if (!pathClosed) path.push({ x: p.x, y: p.y })
      break
    }

    // 포탈을 타면 선이 이어지면 안 된다. 경로를 끊어 순간이동임을 드러낸다.
    if (warp.warped) {
      if (!pathClosed) {
        path.push({ x: NaN, y: NaN })
        path.push({ x: p.x, y: p.y })
      }
      continue
    }

    const turned = directionChanged(prevVx, prevVy, p.vx, p.vy)
    if (turned) bounces++

    // 그리는 것만 자르고 계산은 끝까지 돌린다.
    // 시뮬레이션까지 끊으면 carom처럼 결과가 나중에 나오는 샷을 확인할 수 없다 —
    // 큐볼이 중립구를 맞히고 튕긴 뒤에야 그 중립구가 타깃에 닿기 때문이다.
    if (bounces > maxBounces) pathClosed = true

    if (!pathClosed && (contacts.length || turned || (s + 1) % FORESIGHT.sampleEvery === 0)) {
      path.push({ x: p.x, y: p.y })
    }
  }

  return { path, hitTime, hitX, hitY, hitBodyId, hitRole, dies, dieTime, dieX, dieY, destroys }
}

/**
 * 진행 방향이 꺾였는가.
 * 감쇠와 최소속력 보정은 크기만 바꾸고 방향은 그대로이므로 정규화 내적으로 판별한다.
 */
function directionChanged(ax: number, ay: number, bx: number, by: number): boolean {
  const la = Math.hypot(ax, ay)
  const lb = Math.hypot(bx, by)
  if (la < 1e-6 || lb < 1e-6) return false
  return (ax * bx + ay * by) / (la * lb) < 0.999
}
