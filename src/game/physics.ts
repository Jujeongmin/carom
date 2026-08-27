import { PHYSICS, PLAYER, PORTAL, VIEW } from './config'
import type { Body, Player, Portal } from './types'

/**
 * 닫힌 아레나의 한 스텝.
 *
 * 예지는 이 함수를 복제 상태 위에서 반복 호출해 만든다.
 * 따라서 여기에 난수나 외부 상태가 섞이면 예측과 실제가 어긋나고,
 * 그 순간 게임의 약속("보여준 미래가 진짜 미래다")이 깨진다.
 * 스폰·점수·입력은 전부 engine 쪽에 두고 이 함수는 순수 물리만 담당한다.
 */
export interface ArenaOptions {
  /** 이 스텝에 플레이어와 실제로 충돌한 물체의 id. 넘기면 비우고 채운다. */
  contacts?: number[]
  /** 큐볼만 통과하는 포탈. 조준선이 포탈을 반영하려면 물리 쪽에 있어야 한다. */
  portals?: Portal[]
  /** 포탈 잠금 판정용 현재 시각(초) */
  now?: number
  /** 포탈을 탔으면 true로 설정된다 */
  out?: { warped: boolean; warpX: number; warpY: number }
}

export function advanceArena(
  bodies: Body[],
  player: Player | null,
  dt: number,
  opts: ArenaOptions = {},
) {
  const playerContacts = opts.contacts
  if (playerContacts) playerContacts.length = 0
  if (opts.out) opts.out.warped = false

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.x += b.vx * dt
    b.y += b.vy * dt
    bounceOffWalls(b)
  }

  resolveBodyCollisions(bodies)

  if (player) {
    player.x += player.vx * dt
    player.y += player.vy * dt

    const d = Math.exp(-PLAYER.damping * dt)
    player.vx *= d
    player.vy *= d

    const speed = Math.hypot(player.vx, player.vy)
    if (speed > PLAYER.maxSpeed) {
      const s = PLAYER.maxSpeed / speed
      player.vx *= s
      player.vy *= s
    } else if (speed < PLAYER.minSpeed) {
      // 정지를 구조적으로 막는다. 멈추면 예지선이 점이 되고 게임이 사라진다.
      const s = speed < 0.001 ? 0 : PLAYER.minSpeed / speed
      if (s === 0) player.vy = -PLAYER.minSpeed
      else {
        player.vx *= s
        player.vy *= s
      }
    }

    // 큐볼은 다른 공을 통과하지 않는다. 이 해소가 없으면 당구가 아니라 유령이 된다.
    resolvePlayerCollisions(player, bodies, playerContacts)
    bouncePlayerOffWalls(player)

    // 포탈은 물리 단계에서 처리한다. 그래야 조준선이 공짜로 포탈을 반영한다.
    if (opts.portals?.length) applyPortals(player, opts.portals, opts.now ?? 0, opts.out)
  }
}

function applyPortals(
  p: Player,
  portals: Portal[],
  now: number,
  out?: { warped: boolean; warpX: number; warpY: number },
) {
  if (now < p.portalLockUntil) return

  for (const portal of portals) {
    const inA = Math.hypot(p.x - portal.ax, p.y - portal.ay) < portal.r
    const inB = !inA && Math.hypot(p.x - portal.bx, p.y - portal.by) < portal.r
    if (!inA && !inB) continue

    // 속도는 그대로 유지한다. 방향까지 바뀌면 조준선을 읽어도 예측이 안 선다.
    p.x = inA ? portal.bx : portal.ax
    p.y = inA ? portal.by : portal.ay
    p.portalLockUntil = now + PORTAL.lockSec
    if (out) {
      out.warped = true
      out.warpX = p.x
      out.warpY = p.y
    }
    return
  }
}

/**
 * 플레이어-물체 충돌.
 * 플레이어에게도 질량을 준다. 무한 질량이면 다른 공만 튕겨나가고 큐볼은
 * 직진하는데, 그러면 각을 읽는 재미가 사라진다.
 */
function resolvePlayerCollisions(p: Player, bodies: Body[], contacts?: number[]) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    const dx = b.x - p.x
    const dy = b.y - p.y
    const distSq = dx * dx + dy * dy
    const minDist = b.r + p.r
    if (distSq >= minDist * minDist || distSq === 0) continue

    // 충돌이 실제로 일어난 그 순간을 기록한다.
    // 게임 판정이 이 목록만 보게 하면 "얼마나 겹쳐야 닿은 것인가"를 추측할 필요가 없고,
    // 엔진과 조준선이 같은 목록을 보므로 둘이 갈라지지 않는다.
    if (contacts) contacts.push(b.id)

    const dist = Math.sqrt(distSq)
    const nx = dx / dist
    const ny = dy / dist
    const invSum = PLAYER.invMass + b.invMass
    if (invSum === 0) continue

    const overlap = minDist - dist
    p.x -= nx * overlap * (PLAYER.invMass / invSum)
    p.y -= ny * overlap * (PLAYER.invMass / invSum)
    b.x += nx * overlap * (b.invMass / invSum)
    b.y += ny * overlap * (b.invMass / invSum)

    const vn = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny
    if (vn >= 0) continue
    const j = (-(1 + PHYSICS.restitution) * vn) / invSum
    p.vx -= nx * j * PLAYER.invMass
    p.vy -= ny * j * PLAYER.invMass
    b.vx += nx * j * b.invMass
    b.vy += ny * j * b.invMass
  }
}

function bounceOffWalls(b: Body) {
  const e = PHYSICS.wallRestitution
  if (b.x - b.r < 0) {
    b.x = b.r
    b.vx = Math.abs(b.vx) * e
  } else if (b.x + b.r > VIEW.w) {
    b.x = VIEW.w - b.r
    b.vx = -Math.abs(b.vx) * e
  }
  if (b.y - b.r < 0) {
    b.y = b.r
    b.vy = Math.abs(b.vy) * e
  } else if (b.y + b.r > VIEW.h) {
    b.y = VIEW.h - b.r
    b.vy = -Math.abs(b.vy) * e
  }
}

function bouncePlayerOffWalls(p: Player) {
  const e = PLAYER.wallRestitution
  if (p.x - p.r < 0) {
    p.x = p.r
    p.vx = Math.abs(p.vx) * e
  } else if (p.x + p.r > VIEW.w) {
    p.x = VIEW.w - p.r
    p.vx = -Math.abs(p.vx) * e
  }
  if (p.y - p.r < 0) {
    p.y = p.r
    p.vy = Math.abs(p.vy) * e
  } else if (p.y + p.r > VIEW.h) {
    p.y = VIEW.h - p.r
    p.vy = -Math.abs(p.vy) * e
  }
}

function resolveBodyCollisions(bodies: Body[]) {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]
    for (let k = i + 1; k < bodies.length; k++) {
      const b = bodies[k]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distSq = dx * dx + dy * dy
      const minDist = a.r + b.r
      if (distSq >= minDist * minDist || distSq === 0) continue

      const dist = Math.sqrt(distSq)
      const nx = dx / dist
      const ny = dy / dist
      const invSum = a.invMass + b.invMass
      if (invSum === 0) continue

      const overlap = minDist - dist
      a.x -= nx * overlap * (a.invMass / invSum)
      a.y -= ny * overlap * (a.invMass / invSum)
      b.x += nx * overlap * (b.invMass / invSum)
      b.y += ny * overlap * (b.invMass / invSum)

      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (vn >= 0) continue
      const j = (-(1 + PHYSICS.restitution) * vn) / invSum
      a.vx -= nx * j * a.invMass
      a.vy -= ny * j * a.invMass
      b.vx += nx * j * b.invMass
      b.vy += ny * j * b.invMass
    }
  }
}

/**
 * 접촉 판정 허용치.
 *
 * 충돌 해소가 두 원을 정확히 맞닿는 거리로 밀어내기 때문에, 그 뒤에 엄격 부등호로
 * 겹침을 검사하면 경계값에서 부동소수점에 따라 참/거짓이 갈린다.
 * 파괴 판정과 예지가 같은 값을 써야 "보여준 대로 된다"는 약속이 지켜진다.
 */
export const CONTACT_TOL = 1.5

export function inContact(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
  tol = CONTACT_TOL,
): boolean {
  const dx = bx - ax
  const dy = by - ay
  const md = ar + br + tol
  return dx * dx + dy * dy < md * md
}

/** 플레이어와 닿은 물체의 인덱스. 없으면 -1. */
export function findPlayerHit(player: Player, bodies: Body[]): number {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    const dx = b.x - player.x
    const dy = b.y - player.y
    const md = b.r + player.r
    if (dx * dx + dy * dy < md * md) return i
  }
  return -1
}

export function cloneBodies(src: Body[]): Body[] {
  const out: Body[] = new Array(src.length)
  for (let i = 0; i < src.length; i++) {
    const b = src[i]
    out[i] = {
      id: b.id,
      role: b.role,
      chargedAt: b.chargedAt,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      r: b.r,
      invMass: b.invMass,
      variant: b.variant,
    }
  }
  return out
}
