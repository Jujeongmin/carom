import { DASH } from './config'

export interface Shot {
  /** 임펄스 벡터 */
  vx: number
  vy: number
  /** 0~1. UI 게이지와 조준선 굵기에 쓴다. */
  power: number
}

/**
 * 앵커(누른 지점)에서 현재 손가락 위치까지 당긴 결과.
 * 공은 당긴 방향의 **반대**로 나간다 — 새총과 같다.
 *
 * 엔진과 조준선이 반드시 이 함수 하나만 쓰게 한다.
 * 발사 계산이 두 벌 있으면 보여준 것과 실제가 갈라진다.
 */
export function shotFrom(
  anchorX: number,
  anchorY: number,
  pullX: number,
  pullY: number,
): Shot | null {
  const dx = anchorX - pullX
  const dy = anchorY - pullY
  const d = Math.hypot(dx, dy)
  if (d < DASH.deadzone) return null

  const t = Math.min(1, (d - DASH.deadzone) / Math.max(1, DASH.maxPull - DASH.deadzone))
  const impulse = DASH.minImpulse + (DASH.maxImpulse - DASH.minImpulse) * t
  return { vx: (dx / d) * impulse, vy: (dy / d) * impulse, power: t }
}
