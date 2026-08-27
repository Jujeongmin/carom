/**
 * 예지(3초 앞 예측) 비용 측정.
 *   npx tsx scripts/perf-foresight.ts
 *
 * CAROM의 최대 기술 리스크는 재미가 아니라 프레임이다.
 * 게임을 만들기 전에 "모바일에서 예측이 프레임 예산에 들어오는가"부터 답을 낸다.
 *
 * 측정 대상: 닫힌 아레나에서 물체 N개가 벽과 서로에게 튕기는 상태를
 * 복제해 180스텝(3초) 빨리 감고, 플레이어의 첫 충돌 시각을 찾는 비용.
 */

const DT = 1 / 60
const STEPS = 180 // 3초
const W = 540
const H = 960
const RESTITUTION = 0.95

interface B {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  invMass: number
}

function makeArena(n: number, seed = 1): B[] {
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) | 0
    return ((s >>> 8) % 100000) / 100000
  }
  const bodies: B[] = []
  for (let i = 0; i < n; i++) {
    const r = 12 + rnd() * 24
    bodies.push({
      x: r + rnd() * (W - r * 2),
      y: r + rnd() * (H - r * 2),
      vx: (rnd() * 2 - 1) * 160,
      vy: (rnd() * 2 - 1) * 160,
      r,
      invMass: 1 / (r / 12),
    })
  }
  return bodies
}

function cloneBodies(src: B[]): B[] {
  const out: B[] = new Array(src.length)
  for (let i = 0; i < src.length; i++) {
    const b = src[i]
    out[i] = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, invMass: b.invMass }
  }
  return out
}

function stepArena(bodies: B[], px: { x: number; y: number; vx: number; vy: number; r: number }) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.x += b.vx * DT
    b.y += b.vy * DT
    if (b.x - b.r < 0) {
      b.x = b.r
      b.vx = Math.abs(b.vx)
    } else if (b.x + b.r > W) {
      b.x = W - b.r
      b.vx = -Math.abs(b.vx)
    }
    if (b.y - b.r < 0) {
      b.y = b.r
      b.vy = Math.abs(b.vy)
    } else if (b.y + b.r > H) {
      b.y = H - b.r
      b.vy = -Math.abs(b.vy)
    }
  }

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
      const overlap = minDist - dist
      const invSum = a.invMass + b.invMass
      a.x -= nx * overlap * (a.invMass / invSum)
      a.y -= ny * overlap * (a.invMass / invSum)
      b.x += nx * overlap * (b.invMass / invSum)
      b.y += ny * overlap * (b.invMass / invSum)
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (vn < 0) {
        const j = (-(1 + RESTITUTION) * vn) / invSum
        a.vx -= nx * j * a.invMass
        a.vy -= ny * j * a.invMass
        b.vx += nx * j * b.invMass
        b.vy += ny * j * b.invMass
      }
    }
  }

  px.x += px.vx * DT
  px.y += px.vy * DT
  if (px.x - px.r < 0 || px.x + px.r > W) px.vx = -px.vx
  if (px.y - px.r < 0 || px.y + px.r > H) px.vy = -px.vy
}

/** 플레이어가 아무것도 안 했을 때 몇 초 뒤 어디서 죽는지. 못 찾으면 null. */
function predict(bodies: B[], player: { x: number; y: number; vx: number; vy: number; r: number }) {
  const sim = cloneBodies(bodies)
  const p = { ...player }
  for (let s = 0; s < STEPS; s++) {
    stepArena(sim, p)
    for (let i = 0; i < sim.length; i++) {
      const b = sim[i]
      const dx = b.x - p.x
      const dy = b.y - p.y
      const md = b.r + p.r
      if (dx * dx + dy * dy < md * md) {
        return { t: s * DT, x: p.x, y: p.y }
      }
    }
  }
  return null
}

/** 조기 탈출 없이 180스텝을 끝까지 도는 최악 비용. 실제 프레임 예산은 이걸로 잡아야 한다. */
function predictFull(
  bodies: B[],
  player: { x: number; y: number; vx: number; vy: number; r: number },
) {
  const sim = cloneBodies(bodies)
  const p = { ...player }
  let firstHit = -1
  for (let s = 0; s < STEPS; s++) {
    stepArena(sim, p)
    if (firstHit < 0) {
      for (let i = 0; i < sim.length; i++) {
        const b = sim[i]
        const dx = b.x - p.x
        const dy = b.y - p.y
        const md = b.r + p.r
        if (dx * dx + dy * dy < md * md) {
          firstHit = s
          break
        }
      }
    }
  }
  return firstHit
}

function bench(n: number, iterations = 300) {
  const bodies = makeArena(n)
  const player = { x: W / 2, y: H * 0.7, vx: 40, vy: -60, r: 18 }

  predictFull(bodies, player)
  predict(bodies, player)

  const t0 = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) predictFull(bodies, player)
  const t1 = process.hrtime.bigint()
  const worstMs = Number(t1 - t0) / 1e6 / iterations

  const t2 = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) predict(bodies, player)
  const t3 = process.hrtime.bigint()
  const typicalMs = Number(t3 - t2) / 1e6 / iterations

  const hit = predictFull(bodies, player)
  return { n, worstMs, typicalMs, hitStep: hit }
}

console.log('예지 1회 비용 — 데스크톱 Node 기준\n')
console.log('물체수  최악(ms)  조기탈출(ms)  최악이 프레임예산(16.7ms)에서 차지  첫충돌')
for (const n of [10, 15, 20, 25, 30, 40, 60]) {
  const r = bench(n)
  const share = (r.worstMs / 16.7) * 100
  const hit = r.hitStep < 0 ? '없음' : `${(r.hitStep / 60).toFixed(2)}s`
  console.log(
    `${String(n).padStart(4)}  ${r.worstMs.toFixed(3).padStart(8)}  ${r.typicalMs.toFixed(3).padStart(12)}  ${(share.toFixed(1) + '%').padStart(32)}  ${hit.padStart(6)}`,
  )
}
console.log('\n모바일은 데스크톱 대비 3~5배 느리게 잡을 것.')
