import { drawSprite, sprite, type Sprite, type SpriteName } from './assets'
import { BOMB, CHAIN, PALETTE, VIEW } from './config'
import type { Body, FxEvent, GameState, Portal, Prediction } from './types'

/**
 * 상태를 읽어 그리기만 한다. 상태를 변경하지 않는다.
 * 에셋이 없으면 도형으로 대체한다 — 게임은 어느 쪽이든 돌아간다.
 */

export interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
}

export interface ActiveFx extends FxEvent {
  at: number
}

export const FX_SEC = 0.55

export function computeViewport(cssW: number, cssH: number): Viewport {
  const scale = Math.min(cssW / VIEW.w, cssH / VIEW.h)
  return {
    scale,
    offsetX: (cssW - VIEW.w * scale) / 2,
    offsetY: (cssH - VIEW.h * scale) / 2,
  }
}

export function screenToWorld(vp: Viewport, sx: number, sy: number) {
  return { x: (sx - vp.offsetX) / vp.scale, y: (sy - vp.offsetY) / vp.scale }
}

/** 실패 지점 표시 문구. 위험물이든 조건 위반이든 플레이어에겐 똑같이 "여기서 끝난다"이다. */
const DOOM_LABEL = '여기서 실패'

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  vp: Viewport,
  prediction: Prediction | null,
  effects: ActiveFx[],
  /** 착용 스킨. 코스메틱이라 시뮬레이션 상태에 넣지 않고 그릴 때만 넘긴다. */
  skin: SpriteName = 'char_base',
) {
  const { canvas } = ctx
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#05050d'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const dpr = canvas.width / (canvas.clientWidth || 1)
  ctx.setTransform(vp.scale * dpr, 0, 0, vp.scale * dpr, vp.offsetX * dpr, vp.offsetY * dpr)

  const cssW = canvas.clientWidth || VIEW.w
  const cssH = canvas.clientHeight || VIEW.h
  drawBackdrop(ctx, {
    x: -vp.offsetX / vp.scale,
    y: -vp.offsetY / vp.scale,
    w: cssW / vp.scale,
    h: cssH / vp.scale,
  })

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, VIEW.w, VIEW.h)
  ctx.clip()

  drawArenaEdge(ctx, state)
  for (const portal of state.portals) drawPortal(ctx, portal, state.time)
  const orderNext = state.spec.objective === 'inOrder' ? state.orderNext : undefined
  const dangerousNeutral = state.spec.objective === 'noNeutral'
  for (const b of state.bodies) {
    drawBody(ctx, b, state.time, prediction, orderNext, dangerousNeutral)
  }
  if (prediction) drawAimLine(ctx, prediction)
  drawPlayer(ctx, state, skin)
  for (const fx of effects) drawFx(ctx, fx, state.time)

  ctx.restore()
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function drawBackdrop(ctx: CanvasRenderingContext2D, area: Rect) {
  ctx.fillStyle = PALETTE.bg
  ctx.fillRect(area.x, area.y, area.w, area.h)
  const bg = sprite('bg_space_tile')
  if (!bg) return
  for (let y = area.y - VIEW.h; y < area.y + area.h; y += VIEW.h) {
    ctx.drawImage(bg.img, 0, y, VIEW.w, VIEW.h)
  }
}

/** 벽이 안 보이면 튕김이 버그처럼 읽힌다. 조준 중에는 더 밝혀 당구대임을 강조한다. */
function drawArenaEdge(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.strokeStyle = state.aiming ? 'rgba(77,225,255,0.4)' : 'rgba(77,225,255,0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, VIEW.w - 2, VIEW.h - 2)
}

function bodySprite(b: Body): Sprite | undefined {
  const a = b.variant === 0
  if (b.role === 'hazard') return sprite(a ? 'ob_metal_a' : 'ob_metal_b')
  if (b.role === 'target') return sprite(a ? 'ob_asteroid_a' : 'ob_asteroid_b')
  if (b.role === 'bomb') return sprite(a ? 'ob_bomb_a' : 'ob_bomb_b')
  return sprite(a ? 'ob_shard_a' : 'ob_shard_b')
}

/**
 * 기둥 — 구조물로 읽혀야 한다.
 * 발광을 주면 공으로 보이고, 공으로 보이면 부술 수 있다고 착각한다.
 * 그래서 무채색 단색에 안쪽 그림자만 넣는다.
 */
function drawWall(ctx: CanvasRenderingContext2D, b: Body) {
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
  ctx.fillStyle = '#232a38'
  ctx.fill()
  ctx.strokeStyle = 'rgba(150,165,190,0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.62, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
}

/**
 * 폭발통 — 전용 에셋이 나오기 전까지의 도형 표현.
 * 파괴 반경은 조준선이 이 폭발통을 가리킬 때만 그린다.
 * 항상 띄우면 반경 원 여러 개가 배경을 덮어 정작 공이 안 보인다.
 */
function drawBomb(ctx: CanvasRenderingContext2D, b: Body, time: number, showRadius: boolean) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 5 + b.id)

  if (showRadius) {
    ctx.beginPath()
    ctx.arc(b.x, b.y, BOMB.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,140,60,${0.35 + pulse * 0.25})`
    ctx.setLineDash([6, 10])
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.setLineDash([])
  }

  const s = bodySprite(b)
  if (s) {
    // 스프라이트가 있으면 그대로 쓰고, 맥동하는 링만 얹어 "터진다"를 알린다
    drawSprite(ctx, s, b.x, b.y, b.r, (b.id % 5) * 0.7)
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,150,60,${0.45 + pulse * 0.45})`
    ctx.lineWidth = 2
    ctx.stroke()
    return
  }

  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
  ctx.fillStyle = '#3a2418'
  ctx.fill()
  ctx.strokeStyle = `rgba(255,150,60,${0.75 + pulse * 0.25})`
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,170,80,${0.55 + pulse * 0.45})`
  ctx.fill()
}

/**
 * 포탈.
 * 두 입구를 옅은 선으로 이어 같은 쌍임을 보여준다.
 * 이게 없으면 어디로 나오는지 몰라 조준이 도박이 된다.
 */
function drawPortal(ctx: CanvasRenderingContext2D, portal: Portal, time: number) {
  ctx.save()
  ctx.setLineDash([3, 12])
  ctx.strokeStyle = 'rgba(180,123,255,0.28)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(portal.ax, portal.ay)
  ctx.lineTo(portal.bx, portal.by)
  ctx.stroke()
  ctx.restore()

  const ring = sprite('portal_ring')
  for (const [x, y] of [
    [portal.ax, portal.ay],
    [portal.bx, portal.by],
  ]) {
    glow(ctx, x, y, portal.r * 1.7, 'rgba(180,123,255,0.35)')
    if (ring) {
      // 천천히 돌려서 살아 있는 관문으로 보이게 한다
      drawSprite(ctx, ring, x, y, portal.r, time * 0.5)
      continue
    }
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.6 + i / 3) % 1
      ctx.beginPath()
      ctx.arc(x, y, portal.r * (0.35 + t * 0.75), 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(180,123,255,${(1 - t) * 0.8})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  b: Body,
  time: number,
  prediction: Prediction | null,
  orderNext?: number,
  dangerousNeutral = false,
) {
  const aimedAt = prediction?.hitBodyId === b.id
  const charged = b.chargedAt >= 0 && time - b.chargedAt <= CHAIN.windowSec
  const rot = (b.id % 7) * 0.9 + time * (b.role === 'hazard' ? 0.5 : 0.2) * (b.id % 2 ? 1 : -1)

  if (b.role === 'wall') {
    drawWall(ctx, b)
    if (aimedAt) aimRing(ctx, b, time, '150,165,190')
    return
  }

  if (b.role === 'hazard') glow(ctx, b.x, b.y, b.r * 2, 'rgba(255,77,94,0.5)')
  else if (b.role === 'target') glow(ctx, b.x, b.y, b.r * 1.9, 'rgba(255,201,77,0.34)')
  else if (b.role === 'bomb') glow(ctx, b.x, b.y, b.r * 2.1, 'rgba(255,140,60,0.45)')
  else if (b.role === 'neutral' && dangerousNeutral) {
    // noNeutral — 각을 만들던 공이 지뢰가 됐다는 것을 색으로 먼저 알려야 한다
    glow(ctx, b.x, b.y, b.r * 1.9, 'rgba(255,77,94,0.4)')
  } else glow(ctx, b.x, b.y, b.r * 1.6, 'rgba(180,200,230,0.2)')

  if (b.role === 'bomb') {
    drawBomb(ctx, b, time, aimedAt)
    if (aimedAt) aimRing(ctx, b, time, '255,150,60')
    return
  }

  const s = bodySprite(b)
  if (s) drawSprite(ctx, s, b.x, b.y, b.r, rot)
  else {
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fillStyle =
      b.role === 'hazard' ? PALETTE.hazard : b.role === 'target' ? PALETTE.target : PALETTE.neutral
    ctx.fill()
  }

  // 타깃 테두리 — 부술 것과 부술 수 없는 것을 형태 말고 링으로도 구분한다
  if (b.role === 'target') {
    const isNext = orderNext !== undefined && b.order === orderNext
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2)
    ctx.strokeStyle = isNext ? 'rgba(255,201,77,1)' : 'rgba(255,201,77,0.75)'
    ctx.lineWidth = isNext ? 4 : 2
    ctx.stroke()

    // inOrder — 번호를 크게 띄운다. 다음 차례만 밝고 나머지는 죽인다.
    if (b.order !== undefined) {
      const done = orderNext !== undefined && b.order < orderNext
      ctx.font = '800 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isNext
        ? 'rgba(10,10,26,0.95)'
        : done
          ? 'rgba(255,255,255,0.25)'
          : 'rgba(255,255,255,0.75)'
      if (isNext) {
        ctx.beginPath()
        ctx.arc(b.x, b.y, 14, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,201,77,0.95)'
        ctx.fill()
        ctx.fillStyle = 'rgba(10,10,26,0.95)'
      }
      ctx.fillText(String(b.order), b.x, b.y)
    }
  }

  // 충전된 중립구 — 지금 타깃을 치면 연쇄가 된다는 표시
  if (charged && b.role === 'neutral') {
    const pulse = 0.5 + 0.5 * Math.sin(time * 16)
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,201,77,${pulse})`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // 조준선이 가리키는 대상
  if (aimedAt) {
    aimRing(
      ctx,
      b,
      time,
      b.role === 'hazard' ? '255,77,94' : b.role === 'target' ? '255,201,77' : '77,225,255',
    )
  }
}

function aimRing(ctx: CanvasRenderingContext2D, b: Body, time: number, rgb: string) {
  const pulse = 0.55 + 0.45 * Math.sin(time * 16)
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r + 9, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${rgb},${pulse})`
  ctx.lineWidth = 3
  ctx.stroke()
}

/**
 * 조준선. 이 게임의 얼굴이다.
 * 색이 곧 판정이다 — 금색이면 타깃을 맞히고, 빨강이면 죽고, 파랑이면 아무 일도 없다.
 * 색만 보고도 칠지 말지 결정할 수 있어야 한다.
 */
function drawAimLine(ctx: CanvasRenderingContext2D, pred: Prediction) {
  const role = pred.hitRole
  // 색은 역할이 아니라 실제 결과로 정한다.
  // carom에서는 타깃을 직격해도 아무 일이 없는데, 역할로 칠하면 금색이 되어 거짓말이 된다.
  const color = pred.dies
    ? '255,77,94'
    : pred.destroys > 0
      ? '255,201,77'
      : role === 'bomb'
        ? '255,150,60'
        : '77,225,255'
  const alpha = 0.95

  ctx.save()
  ctx.setLineDash([10, 6])
  ctx.lineWidth = 3
  ctx.strokeStyle = `rgba(${color},${alpha})`
  ctx.beginPath()
  // NaN은 포탈로 순간이동한 지점이다. 선을 이으면 통과한 것처럼 보이므로 끊는다.
  let penDown = false
  for (const p of pred.path) {
    if (Number.isNaN(p.x)) {
      penDown = false
      continue
    }
    if (!penDown) {
      ctx.moveTo(p.x, p.y)
      penDown = true
    } else {
      ctx.lineTo(p.x, p.y)
    }
  }
  ctx.stroke()
  ctx.restore()

  // 폭발통을 노리면 몇 개가 쓸려나가는지 미리 보여준다. 이게 없으면 폭발이 도박이 된다.
  if (pred.destroys > 1) {
    ctx.font = '700 18px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,150,60,0.95)'
    ctx.fillText(`${pred.destroys}개`, pred.hitX, pred.hitY - 34)
  }

  // 경로 끝에서 죽는 샷은 첫 충돌이 무엇이든 반드시 알린다.
  // 이걸 숨기면 "타깃 맞혔는데 왜 죽었지"가 되고, 조준선을 믿을 수 없게 된다.
  if (pred.dies) {
    ctx.beginPath()
    ctx.arc(pred.dieX, pred.dieY, 20, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,77,94,0.95)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pred.dieX - 9, pred.dieY - 9)
    ctx.lineTo(pred.dieX + 9, pred.dieY + 9)
    ctx.moveTo(pred.dieX + 9, pred.dieY - 9)
    ctx.lineTo(pred.dieX - 9, pred.dieY + 9)
    ctx.stroke()

    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,77,94,0.95)'
    ctx.fillText(DOOM_LABEL, pred.dieX, pred.dieY - 32)
  }

  if (pred.hitTime < 0) return

  const r = role === 'hazard' ? 18 : 14
  ctx.beginPath()
  ctx.arc(pred.hitX, pred.hitY, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${color},${alpha})`
  ctx.lineWidth = 2
  ctx.stroke()

  if (role === 'hazard') {
    ctx.beginPath()
    ctx.moveTo(pred.hitX - 8, pred.hitY - 8)
    ctx.lineTo(pred.hitX + 8, pred.hitY + 8)
    ctx.moveTo(pred.hitX + 8, pred.hitY - 8)
    ctx.lineTo(pred.hitX - 8, pred.hitY + 8)
    ctx.strokeStyle = `rgba(${color},${alpha})`
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

/**
 * 큐볼.
 *
 * 화면에 금색 타깃·빨간 위험물·주황 폭발통·보라 포탈이 깔리면 시안 구슬 하나는 묻힌다.
 * 큐볼은 매 순간 눈으로 좇아야 하는 유일한 물체이므로 다른 것들보다 확실히 튀어야 한다.
 *
 * 세 겹으로 강조한다:
 *   1) 속도 방향 잔상 — 빠를 때 위치를 좇을 수 있게
 *   2) 맥동하는 이중 링 — 멈춰 있어도 눈에 걸리게
 *   3) 넓은 발광 — 어두운 배경에서 먼저 보이게
 */
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, skin: SpriteName) {
  const p = state.player
  if (state.time < p.invulnUntil && Math.floor(state.time * 12) % 2 === 0) return

  const speed = Math.hypot(p.vx, p.vy)

  // 1) 잔상 — 속도에 비례해 길어진다. 속도에서 유도하므로 기록을 들고 있을 필요가 없다.
  if (speed > 40) {
    const ux = -p.vx / speed
    const uy = -p.vy / speed
    for (let i = 1; i <= 4; i++) {
      const d = (speed * 0.011) * i
      const a = 0.22 * (1 - i / 5)
      ctx.beginPath()
      ctx.arc(p.x + ux * d, p.y + uy * d, p.r * (1 - i * 0.13), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(77,225,255,${a})`
      ctx.fill()
    }
  }

  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.5)
  glow(ctx, p.x, p.y, p.r * (2.8 + pulse * 0.5), `rgba(77,225,255,${0.45 + pulse * 0.2})`)

  const s = sprite(skin) ?? sprite('char_base')
  if (s) drawSprite(ctx, s, p.x, p.y, p.r)
  else {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE.player
    ctx.fill()
  }

  // 2) 이중 링 — 안쪽은 또렷하게, 바깥은 숨쉬듯
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(150,240,255,0.9)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r + 10 + pulse * 4, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(77,225,255,${0.5 - pulse * 0.3})`
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawFx(ctx: CanvasRenderingContext2D, fx: ActiveFx, now: number) {
  const t = (now - fx.at) / FX_SEC
  if (t < 0 || t > 1) return
  const alpha = 1 - t

  if (fx.kind === 'dash') {
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, 18 + t * 34, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(77,225,255,${alpha * 0.7})`
    ctx.lineWidth = 2
    ctx.stroke()
    return
  }

  if (fx.kind === 'explode') {
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, BOMB.radius * (0.3 + t * 0.75), 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,150,60,${alpha})`
    ctx.lineWidth = 5 * alpha + 1
    ctx.stroke()
    glow(ctx, fx.x, fx.y, BOMB.radius * (0.4 + t * 0.6), `rgba(255,150,60,${alpha * 0.4})`)
    if (fx.depth > 0) {
      ctx.font = `700 ${20 + fx.depth * 4}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(255,190,90,${alpha})`
      ctx.fillText(`${fx.depth}개!`, fx.x, fx.y - 40 - t * 20)
    }
    return
  }

  if (fx.kind === 'warp') {
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, 12 + t * 46, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(180,123,255,${alpha})`
    ctx.lineWidth = 3 * alpha + 0.5
    ctx.stroke()
    return
  }

  // destroy / chain
  const gold = `rgba(255,201,77,${alpha})`
  ctx.beginPath()
  ctx.arc(fx.x, fx.y, 22 + t * 48, 0, Math.PI * 2)
  ctx.strokeStyle = gold
  ctx.lineWidth = 3 * alpha + 0.5
  ctx.stroke()

  if (fx.kind === 'chain' && fx.depth >= 2) {
    ctx.font = `700 ${18 + fx.depth * 4}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = gold
    ctx.fillText(`x${fx.depth}`, fx.x, fx.y - 36 - t * 18)
  }
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
