/**
 * CAROM 튜닝 숫자는 전부 이 파일에만 둔다.
 * 밸런스 조정 = 이 파일 한 곳 편집.
 */

export const VIEW = { w: 540, h: 960 } as const

export const PHYSICS = {
  /** 고정 timestep. 예지가 실제와 일치하려면 시뮬레이션이 결정적이어야 한다. */
  dt: 1 / 60,
  maxStepsPerFrame: 5,
  restitution: 0.97,
  wallRestitution: 1,
} as const

export const PLAYER = {
  r: 17,
  /** 큐볼의 질량. 다른 공보다 가벼우면 각이 크게 꺾여 읽는 재미가 생긴다. */
  invMass: 1,
  /**
   * 감쇠는 거의 없다. 공이 멈추면 조준선이 점이 되고 당구가 성립하지 않는다.
   */
  damping: 0.05,
  /**
   * 임펄스를 올려도 이 값이 잘라내므로 함께 올려야 파워가 실제로 오른다.
   * 상한은 터널링이 정한다: 1100px/s면 한 스텝에 18px, 가장 작은 물체와의
   * 충돌 거리 36px보다 작아 뚫고 지나가지 않는다.
   */
  maxSpeed: 1100,
  minSpeed: 90,
  wallRestitution: 0.92,
  startYRatio: 0.78,
  startVx: 60,
  startVy: -85,
} as const

/**
 * 당겨서 발사.
 * 누른 지점이 앵커가 되고, 반대로 당긴 만큼 세게 나간다.
 * 손가락이 항상 발사 방향 반대편에 있어 조준선을 가리지 않는다.
 */
export const DASH = {
  minImpulse: 190,
  maxImpulse: 850,
  /** 이보다 짧게 당기면 발사하지 않는다. 오터치 취소 구간. */
  deadzone: 16,
  /** 이 거리까지 당기면 최대 파워 */
  maxPull: 175,
} as const

/**
 * 조준 슬로우.
 * 실시간과 당구를 잇는 다리. 누르고 있으면 물리가 느려져 각을 읽을 수 있다.
 * 단 제한 시간은 실제 속도로 흐르므로 조준은 공짜가 아니다.
 */
export const AIM = {
  slowFactor: 0.18,
} as const

export const CHAIN = {
  /** 플레이어 타격을 물고 있는 시간(초). 이 안에 타깃을 쳐야 연쇄로 인정된다. */
  windowSec: 1.6,
  /** 연쇄 깊이당 코인 */
  coinPerDepth: 2,
} as const

/**
 * 클리어 보상.
 *
 * 원래는 연쇄와 폭발로만 코인이 나왔다. 그래서 한 번에 하나씩 깔끔하게 부수면
 * **깨고도 0코인**이었다(측정: 1·5·19스테이지가 0). 깬 사람에게 아무것도 안 주는 것도
 * 문제지만, 그때 "코인 2배" 광고 버튼이 2배로 만들 것이 없어 잠겨버리는 게 더 나빴다.
 *
 * 연쇄·폭발 보너스는 그대로 둔다. 그쪽이 잘한 것에 대한 보상이고,
 * 이건 끝냈다는 것에 대한 보상이다. 둘을 섞으면 어느 쪽도 읽히지 않는다.
 */
export const CLEAR_REWARD = {
  base: 10,
  perTarget: 2,
} as const

/**
 * 조준선.
 * "지금 날리면 어떻게 되는가"만 보여준다. 조준 중이 아니면 그리지 않는다.
 * horizonSec은 미래 예지가 아니라 조준선을 얼마나 길게 그릴지다.
 */
export const FORESIGHT = {
  horizonSec: 3,
  sampleEvery: 5,
  /**
   * 그릴 선분 개수. 벽이나 공에 튕길 때마다 선분이 하나 늘어난다.
   * 만파워로 치면 3초 안에 대여섯 번 튕겨서 화면이 선으로 뒤덮인다.
   * 2로 자르면 "이걸 맞히고 그 다음 어디로 가는가"까지만 보인다.
   */
  maxSegments: 2,
} as const

export const BODY_SPEC = {
  target: { r: 26, invMass: 0.5 },
  neutral: { r: 19, invMass: 0.8 },
  /** 위험물은 무겁다. 밀어서 치우려는 시도가 통하지 않아야 위협으로 남는다. */
  hazard: { r: 23, invMass: 0.12 },
  bomb: { r: 21, invMass: 0.6 },
  /** 질량 무한. 밀리지도 부서지지도 않는다. 당구대의 구조물이다. */
  wall: { r: 34, invMass: 0 },
} as const

/**
 * 스테이지 테마.
 *
 * 구성 숫자만 올리면 13스테이지에서 포화되어 그 뒤가 전부 같아 보인다.
 * 테마는 기둥 배치로 당구대의 모양 자체를 바꿔서 그 포화를 미룬다.
 * 앞 2스테이지는 항상 open — 규칙을 배우는 동안 구조물까지 읽게 하지 않는다.
 */
export const THEME = {
  order: [
    'open',
    'pillars',
    'corridor',
    'barrier',
    'scatter',
    'cross',
    'ring',
    'funnel',
    'columns',
  ] as const,
  plainUntilStage: 2,
} as const

/**
 * 모디파이어 순환.
 *
 * 주기를 조건(6)·테마(9)와 어긋나게 7로 잡는다.
 * 세 축의 최소공배수가 126이라 그만큼 같은 조합이 다시 나오지 않는다.
 * 기본(none)을 절반 가까이 둬서 변주가 특별하게 남도록 한다.
 */
export const MODIFIER = {
  order: ['none', 'swift', 'none', 'shortLine', 'tightTime', 'none', 'noSlow'] as const,
  /** 이 스테이지까지는 변주 없음. 규칙을 먼저 배우게 한다. */
  plainUntilStage: 9,
  swiftSpeedMul: 1.35,
  tightTimeMul: 0.62,
  noSlowFactor: 1,
  shortLineSegments: 1,
} as const

/**
 * barrier 테마 — 포탈 전용 배치.
 *
 * 벽 줄이 아레나를 **틈 없이** 가른다. 타깃은 전부 위, 플레이어는 아래에서 시작한다.
 * 넘어갈 방법은 포탈 하나뿐이다. 큐볼만 포탈을 통과하므로 위쪽 판은 그대로 유지된다.
 *
 * 틈을 하나라도 남기면 포탈이 지름길이 아니라 선택지가 되고, 그러면 이 테마가
 * 존재할 이유가 사라진다.
 */
export const BARRIER = {
  yRatio: 0.5,
  /** 타깃·위험물이 놓이는 구역 (화면 높이 비율) */
  aboveZone: { from: 0.08, to: 0.4 },
  /** 플레이어 쪽 구역 */
  belowZone: { from: 0.58, to: 0.74 },
  /** 포탈 입구 위치 — 벽을 사이에 두고 아래/위로 하나씩 */
  portalBelowY: 0.66,
  portalAboveY: 0.3,
} as const

/**
 * 클리어 조건 순환.
 *
 * 주기를 테마(7)와 다르게 6으로 잡는다. 같은 주기면 테마와 조건이 항상 짝지어 나와
 * 다양성이 7가지로 고정되지만, 서로소가 아니어도 어긋나면 42스테이지까지 조합이 안 겹친다.
 * 기본(destroyAll)을 절반으로 둬서 특수 조건이 특별하게 남도록 한다.
 */
export const OBJECTIVE = {
  order: ['destroyAll', 'noNeutral', 'destroyAll', 'bankShot', 'destroyAll', 'inOrder'] as const,
  /** 이 스테이지까지는 기본 조건만. 규칙을 먼저 배우게 한다. */
  plainUntilStage: 6,
} as const

/**
 * 폭발통.
 * 한 방에 여러 타깃을 쓸 수 있어 대시 절약의 핵심이자 코인의 주요 출처다.
 * 위험물은 폭발로 없어지지 않는다 — 그래야 위험물이 끝까지 위협으로 남는다.
 */
export const BOMB = {
  radius: 135,
  /** 폭발이 주변 물체를 밀어내는 세기. 판이 흔들려 다음 샷의 각이 바뀐다. */
  impulse: 420,
  coinPerTarget: 3,
} as const

/** 큐볼만 통과한다. 양방향. */
export const PORTAL = {
  r: 30,
  /** 나온 직후 재진입 금지 시간(초). 무한 왕복 방지. */
  lockSec: 0.35,
} as const

/** 스테이지 난이도 곡선. 손으로 만든 레벨 데이터는 없다. */
export const STAGE = {
  targets: { base: 2, perStage: 0.5, max: 8 },
  neutrals: { base: 2, perStage: 0.34, max: 6 },
  hazardsFromStage: 3,
  hazards: { perStage: 0.34, max: 4 },
  /** 새 요소는 도입 시점을 어긋나게 둔다. 한 번에 다 나오면 배우지 못한다. */
  bombsFromStage: 5,
  bombs: { max: 3 },
  portalsFromStage: 8,
  /**
   * 제한 시간.
   * 샷 횟수 제한이 없으므로 이것이 유일한 압박이다. 넉넉하면 게임이 사라진다.
   * 봇이 8타깃을 4~9초에 깨므로 여유를 크게 두면 사실상 무제한이 된다.
   */
  timeLimit: { base: 16, perTarget: 3.5, max: 42 },
  /** 샷이 더 드는 조건에는 시간을 더 준다 */
  timeMul: { bankShot: 1.5, inOrder: 1.6 },
  speed: { base: 95, perStage: 4.5, max: 200 },
  /** 생성 시 플레이어에게서 최소 이만큼 떨어뜨린다 */
  clearance: 150,
  /** 물체끼리 최소 간격 */
  spacing: 14,
} as const

export const RULES = {
  /**
   * 시작 무적.
   * 오브젝트가 20개를 넘으면 배치가 아무리 조심스러워도 공들이 흘러와 닿는다.
   * 첫 샷도 못 쏘고 지는 것은 플레이어의 실수가 아니므로 규칙으로 막는다.
   */
  startInvulnSec: 1.4,
  /** 부활 시 돌려주는 시간(초). 샷 제한이 없으므로 시간이 곧 목숨이다. */
  reviveSeconds: 12,
} as const

export const PALETTE = {
  bg: '#0a0a1a',
  player: '#4de1ff',
  coin: '#ffc94d',
  target: '#ffc94d',
  neutral: '#8892a6',
  hazard: '#ff4d5e',
  aim: '#4de1ff',
} as const
