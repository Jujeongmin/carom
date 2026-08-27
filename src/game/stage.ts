import {
  BARRIER,
  BODY_SPEC,
  FORESIGHT,
  MODIFIER,
  OBJECTIVE,
  PLAYER,
  PORTAL,
  RULES,
  STAGE,
  THEME,
  VIEW,
} from './config'
import { rand } from './rng'
import type {
  Body,
  BodyRole,
  ModifierId,
  Objective,
  Player,
  Portal,
  StageSpec,
  ThemeId,
} from './types'

export function themeFor(index: number): ThemeId {
  if (index <= THEME.plainUntilStage) return 'open'
  const theme = THEME.order[index % THEME.order.length]
  // barrier는 포탈이 유일한 통로다. 포탈이 없으면 넘어갈 방법이 아예 없다.
  if (theme === 'barrier' && index < STAGE.portalsFromStage) return 'open'
  return theme
}

export function objectiveFor(index: number): Objective {
  if (index <= OBJECTIVE.plainUntilStage) return 'destroyAll'
  return OBJECTIVE.order[index % OBJECTIVE.order.length]
}

export function modifierFor(index: number): ModifierId {
  if (index <= MODIFIER.plainUntilStage) return 'none'
  return MODIFIER.order[index % MODIFIER.order.length]
}

/**
 * 테마별 기둥 배치.
 * 원만 쓰므로 통로나 십자도 원을 줄지어 놓아 만든다.
 * 배치는 시드에서 유도되어 같은 스테이지 번호면 항상 같은 모양이 나온다.
 */
function buildWalls(
  theme: ThemeId,
  seed: number,
  startId: number,
): { walls: Body[]; seed: number; nextId: number } {
  let s = seed
  let id = startId
  const walls: Body[] = []
  const cx = VIEW.w / 2

  const add = (x: number, y: number, r: number) => {
    walls.push({
      id: id++,
      role: 'wall',
      x,
      y,
      vx: 0,
      vy: 0,
      r,
      invMass: 0,
      chargedAt: -1,
      variant: 0,
    })
  }

  const jitter = (amount: number) => {
    const r = rand(s)
    s = r.seed
    return (r.value * 2 - 1) * amount
  }

  switch (theme) {
    case 'pillars': {
      const count = 2 + Math.floor(Math.abs(jitter(1.99)))
      for (let i = 0; i < count; i++) {
        const y = VIEW.h * (0.24 + (i / Math.max(1, count - 1)) * 0.4)
        add(cx + jitter(120), y, 40)
      }
      break
    }
    case 'corridor': {
      // 좌우에서 안쪽으로 뻗은 두 줄. 가운데 통로만 남는다.
      const y = VIEW.h * 0.4 + jitter(60)
      const gap = 110 + Math.abs(jitter(40))
      for (let i = 0; i < 3; i++) {
        add(cx - gap - i * 54, y, 27)
        add(cx + gap + i * 54, y, 27)
      }
      break
    }
    case 'cross': {
      const y = VIEW.h * 0.38 + jitter(50)
      add(cx, y, 34)
      add(cx - 76, y, 28)
      add(cx + 76, y, 28)
      add(cx, y - 76, 28)
      add(cx, y + 76, 28)
      break
    }
    case 'ring': {
      const y = VIEW.h * 0.36 + jitter(40)
      add(cx, y, 46)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        add(cx + Math.cos(a) * 130, y + Math.sin(a) * 130, 22)
      }
      break
    }
    case 'scatter': {
      const count = 4 + Math.floor(Math.abs(jitter(2.99)))
      for (let i = 0; i < count; i++) {
        const rx = rand(s)
        s = rx.seed
        const ry = rand(s)
        s = ry.seed
        add(60 + rx.value * (VIEW.w - 120), VIEW.h * 0.12 + ry.value * VIEW.h * 0.6, 24)
      }
      break
    }
    case 'barrier': {
      // 틈 없이 가로로 채운다. 넘어갈 방법은 포탈 하나뿐이어야 한다.
      // 원끼리 살짝 겹치게 놓아 공이 사이로 빠져나가지 못하게 한다.
      const r = 30
      const y = VIEW.h * BARRIER.yRatio + jitter(20)
      const step = r * 1.75
      const count = Math.ceil(VIEW.w / step) + 1
      for (let i = 0; i < count; i++) {
        add(Math.min(VIEW.w - r, Math.max(r, i * step)), y, r)
      }
      break
    }
    case 'funnel': {
      // 위로 갈수록 좁아진다. 높은 곳의 타깃일수록 각이 까다로워진다.
      const rows = 4
      for (let i = 0; i < rows; i++) {
        const y = VIEW.h * (0.16 + i * 0.11)
        const spread = 210 - i * 42 + jitter(14)
        add(cx - spread, y, 26)
        add(cx + spread, y, 26)
      }
      break
    }
    case 'columns': {
      // 세로 기둥 줄. 좌우로 가로지르기 어렵고 세로 통로가 생긴다.
      const lanes = 2 + Math.floor(Math.abs(jitter(1.99)))
      for (let i = 0; i < lanes; i++) {
        const x = (VIEW.w / (lanes + 1)) * (i + 1) + jitter(26)
        for (let k = 0; k < 3; k++) {
          add(x, VIEW.h * (0.2 + k * 0.16), 24)
        }
      }
      break
    }
    case 'open':
    default:
      break
  }

  // 화면 밖으로 새거나 플레이어 시작 구역을 막지 않게 정리.
  // 경계는 포함해야 한다 — 엄격 부등호로 자르면 barrier의 양 끝 기둥이 사라져
  // 벽 옆으로 그냥 지나갈 수 있게 되고, 막는 의미가 절반 없어진다.
  const kept = walls.filter(
    (w) => w.x >= w.r && w.x <= VIEW.w - w.r && w.y >= w.r && w.y < VIEW.h * 0.82,
  )
  return { walls: kept, seed: s, nextId: id }
}

/** 스테이지 사양은 번호 하나에서 전부 유도된다. 레벨 데이터 파일이 없다. */
export function stageSpec(index: number): StageSpec {
  let t = Math.min(
    STAGE.targets.max,
    Math.round(STAGE.targets.base + index * STAGE.targets.perStage),
  )
  let n = Math.min(
    STAGE.neutrals.max,
    Math.round(STAGE.neutrals.base + index * STAGE.neutrals.perStage),
  )
  let h =
    index < STAGE.hazardsFromStage
      ? 0
      : Math.min(
          STAGE.hazards.max,
          Math.max(1, Math.round((index - STAGE.hazardsFromStage + 1) * STAGE.hazards.perStage)),
        )

  const theme = themeFor(index)
  // barrier는 포탈로 넘어가는 것 자체가 과제다. 여기에 조건까지 얹으면 두 벽이 겹쳐 막힌다.
  const objective = theme === 'barrier' ? 'destroyAll' : objectiveFor(index)

  // 폭발통과 포탈은 도입 시점을 어긋나게 둔다. 한 번에 다 나오면 배우지 못한다.
  let bombs =
    index < STAGE.bombsFromStage
      ? 0
      : Math.min(STAGE.bombs.max, 1 + Math.floor((index - STAGE.bombsFromStage) / 4))
  // barrier에는 포탈이 반드시 하나 있어야 한다. 없으면 넘어갈 방법이 없어 풀 수 없다.
  const portals =
    theme === 'barrier' ? 1 : index < STAGE.portalsFromStage ? 0 : index % 2 === 0 ? 1 : 0

  // 폭발은 한 방에 여러 개를 부수므로 순서를 지킬 방법이 없다. 두 규칙이 서로 모순이다.
  if (objective === 'inOrder') bombs = 0
  // 순서가 강제되면 매 샷이 특정 한 개를 노려야 한다. 타깃이 많을수록 곱으로 어려워진다.
  if (objective === 'inOrder') t = Math.min(t, 5)
  // 중립구가 이미 치명적인데 위험물까지 가득하면 지나갈 틈이 없다.
  if (objective === 'noNeutral') h = Math.max(0, Math.round(h * 0.5))
  // 중립구가 지뢰가 되는 조건에서 6개를 깔면 피할 길이 없다. 절반으로 줄인다.
  if (objective === 'noNeutral') n = Math.max(1, Math.round(n * 0.5))
  // carom은 중립구를 반드시 거쳐야 하므로 최소 두 개는 있어야 한다.
  if (objective === 'bankShot') n = Math.max(3, n)
  // carom은 직접 타격이 막혀 샷이 늘어난다. 폭발통을 남겨 숨통을 틔운다.
  if (objective === 'bankShot' && bombs === 0 && index >= STAGE.bombsFromStage) bombs = 1

  let timeLimit = Math.min(
    STAGE.timeLimit.max,
    STAGE.timeLimit.base + t * STAGE.timeLimit.perTarget,
  )
  // 샷이 더 드는 조건에는 시간을 더 준다. 샷 제한이 없으니 보정은 시간으로만 한다.
  if (objective === 'bankShot') timeLimit *= STAGE.timeMul.bankShot
  else if (objective === 'inOrder') timeLimit *= STAGE.timeMul.inOrder
  timeLimit = Math.round(timeLimit)
  let speed = Math.min(STAGE.speed.max, STAGE.speed.base + index * STAGE.speed.perStage)
  let aimSegments: number = FORESIGHT.maxSegments

  // 모디파이어는 숫자 하나씩만 건드린다. 규칙을 바꾸지 않으므로 조건·테마와 자유롭게 겹친다.
  //
  // inOrder에 tightTime/shortLine이 겹치면 못 푼다고 보고 한 번 막았다가 되돌렸다.
  // 실제로 실패한 건 변주 없는 inOrder + 기둥 많은 테마였고, 이 조합은 봇이 못 푸는 것이지
  // (봇은 다음 샷을 위한 위치를 계획하지 못한다) 사람이 못 푸는 것과는 다르다.
  const modifier = modifierFor(index)

  if (modifier === 'swift') speed *= MODIFIER.swiftSpeedMul
  else if (modifier === 'tightTime') timeLimit = Math.round(timeLimit * MODIFIER.tightTimeMul)
  else if (modifier === 'shortLine') aimSegments = MODIFIER.shortLineSegments

  return {
    index,
    objective,
    theme,
    modifier,
    aimSegments,
    targets: t,
    neutrals: n,
    hazards: h,
    bombs,
    portals,
    timeLimit,
    speed,
  }
}

/**
 * 물체를 배치한다.
 * 플레이어 근처와 다른 물체 위를 피한다 — 시작하자마자 위험물에 닿아 지는 것은
 * 플레이어의 실수가 아니라 생성기의 실수다.
 */
export function buildStage(
  spec: StageSpec,
  player: Player,
  seed: number,
): { bodies: Body[]; portals: Portal[]; seed: number; nextId: number } {
  // 기둥을 먼저 놓는다. 나머지는 기둥을 피해 배치되어야 한다.
  const built = buildWalls(spec.theme, seed, 1)
  let s = built.seed
  const bodies: Body[] = [...built.walls]
  let id = built.nextId

  /** zone을 주면 그 세로 구간 안에만 놓는다. barrier에서 위/아래를 갈라 배치할 때 쓴다. */
  const place = (role: BodyRole, zone?: { from: number; to: number }) => {
    const conf = BODY_SPEC[role]
    let x = VIEW.w / 2
    let y = VIEW.h / 2
    let ok = false

    const yMin = zone ? VIEW.h * zone.from : conf.r + 8
    const yMax = zone ? VIEW.h * zone.to : VIEW.h * 0.78 - (conf.r + 8)

    for (let attempt = 0; attempt < 60 && !ok; attempt++) {
      const rx = rand(s)
      s = rx.seed
      const ry = rand(s)
      s = ry.seed
      x = conf.r + 8 + rx.value * (VIEW.w - (conf.r + 8) * 2)
      y = yMin + ry.value * Math.max(1, yMax - yMin)

      if (Math.hypot(x - player.x, y - player.y) < STAGE.clearance) continue
      ok = bodies.every(
        (b) => Math.hypot(x - b.x, y - b.y) >= b.r + conf.r + STAGE.spacing,
      )
    }

    const rAng = rand(s)
    s = rAng.seed
    const angle = rAng.value * Math.PI * 2
    const rVar = rand(s)
    s = rVar.seed

    // 타깃과 폭발통은 느리게 움직인다. 빠르면 조준이 운이 된다.
    let speedMul = role === 'target' ? 0.45 : role === 'bomb' ? 0.4 : role === 'hazard' ? 0.85 : 1

    // barrier에서는 위/아래를 갈라 배치하는 것이 규칙의 핵심인데,
    // 타깃이 평소 속도로 움직이면 몇 초 만에 벽 아래로 흘러내려 구분이 무너진다.
    if (spec.theme === 'barrier' && (role === 'target' || role === 'bomb')) speedMul = 0.1

    const speed = spec.speed * speedMul

    bodies.push({
      id: id++,
      role,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: conf.r,
      invMass: conf.invMass,
      chargedAt: -1,
      variant: rVar.value < 0.5 ? 0 : 1,
    })
  }

  // barrier에서는 위/아래를 갈라 배치한다.
  // 벽만 세우고 타깃이 아래에도 깔리면 포탈을 탈 이유가 사라진다.
  const split = spec.theme === 'barrier'
  const above = split ? BARRIER.aboveZone : undefined


  for (let i = 0; i < spec.targets; i++) place('target', above)

  // inOrder — 위에서 아래 순으로 번호를 매긴다.
  // 무작위로 매기면 순서를 외우는 게임이 되고, 공간으로 읽히면 계획하는 게임이 된다.
  if (spec.objective === 'inOrder') {
    const targets = bodies.filter((b) => b.role === 'target').sort((a, b) => a.y - b.y)
    targets.forEach((b, i) => {
      b.order = i + 1
    })
  }
  for (let i = 0; i < spec.bombs; i++) place('bomb', above)
  for (let i = 0; i < spec.hazards; i++) place('hazard', above)

  // 중립구는 위쪽에 둔다. 아래는 포탈까지 가는 통로라 비워두는 편이 읽기 쉽다.
  for (let i = 0; i < spec.neutrals; i++) place('neutral', above)

  // 포탈은 양 끝이 충분히 멀어야 의미가 있다. 가까우면 그냥 굴러가는 것과 같다.
  const portals: Portal[] = []

  // barrier — 포탈이 벽을 사이에 두고 아래/위로 하나씩. 이게 유일한 통로다.
  if (split && spec.portals > 0) {
    const rx = rand(s)
    s = rx.seed
    const rx2 = rand(s)
    s = rx2.seed
    const m = PORTAL.r + 20
    portals.push({
      ax: m + rx.value * (VIEW.w - m * 2),
      ay: VIEW.h * BARRIER.portalBelowY,
      bx: m + rx2.value * (VIEW.w - m * 2),
      by: VIEW.h * BARRIER.portalAboveY,
      r: PORTAL.r,
    })
    return { bodies, portals, seed: s, nextId: id }
  }

  for (let i = 0; i < spec.portals; i++) {
    let a = { x: VIEW.w * 0.2, y: VIEW.h * 0.25 }
    let b = { x: VIEW.w * 0.8, y: VIEW.h * 0.6 }
    for (let attempt = 0; attempt < 40; attempt++) {
      const r1 = rand(s)
      s = r1.seed
      const r2 = rand(s)
      s = r2.seed
      const r3 = rand(s)
      s = r3.seed
      const r4 = rand(s)
      s = r4.seed
      const m = PORTAL.r + 14
      a = { x: m + r1.value * (VIEW.w - m * 2), y: m + r2.value * (VIEW.h * 0.8 - m * 2) }
      b = { x: m + r3.value * (VIEW.w - m * 2), y: m + r4.value * (VIEW.h * 0.8 - m * 2) }
      if (Math.hypot(a.x - b.x, a.y - b.y) < VIEW.h * 0.35) continue
      if (Math.hypot(a.x - player.x, a.y - player.y) < STAGE.clearance) continue
      if (Math.hypot(b.x - player.x, b.y - player.y) < STAGE.clearance) continue
      // 기둥 위에 포탈이 겹치면 들어갈 수가 없다
      const blocked = bodies.some(
        (w) =>
          w.role === 'wall' &&
          (Math.hypot(a.x - w.x, a.y - w.y) < w.r + PORTAL.r ||
            Math.hypot(b.x - w.x, b.y - w.y) < w.r + PORTAL.r),
      )
      if (blocked) continue
      break
    }
    portals.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, r: PORTAL.r })
  }

  return { bodies, portals, seed: s, nextId: id }
}

export function startingPlayer(): Player {
  return {
    x: VIEW.w / 2,
    y: VIEW.h * PLAYER.startYRatio,
    vx: PLAYER.startVx,
    vy: PLAYER.startVy,
    r: PLAYER.r,
    invulnUntil: RULES.startInvulnSec,
    portalLockUntil: 0,
  }
}
