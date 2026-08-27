/**
 * target  — 부숴야 하는 것. 플레이어나 충전된 물체가 치면 파괴된다.
 * hazard  — 닿으면 실패. 부술 수 없다.
 * neutral — 각을 만드는 공. 당구대의 다른 공에 해당한다.
 * bomb    — 맞히면 반경 안 타깃을 한꺼번에 파괴하고, 다른 폭발통도 연쇄시킨다.
 * wall    — 움직이지 않고 부술 수 없는 기둥. 죽지도 않는다. 당구대의 모양을 바꾼다.
 */
export type BodyRole = 'target' | 'hazard' | 'neutral' | 'bomb' | 'wall'

/** 스테이지 성격. 기둥 배치와 구성 비율을 함께 정한다. */
export type ThemeId =
  | 'open'
  | 'pillars'
  | 'corridor'
  | 'cross'
  | 'ring'
  | 'scatter'
  /** 아레나를 가로로 가르는 벽. 포탈이 유일한 통로다. */
  | 'barrier'
  /** 위로 갈수록 좁아지는 V자. 각이 점점 까다로워진다. */
  | 'funnel'
  /** 세로 기둥 줄. 좌우 이동이 막히고 세로 통로만 남는다. */
  | 'columns'

/**
 * 클리어 조건.
 * 같은 배치라도 조건이 바뀌면 다른 게임이 된다. 배치 다양성보다 값싸게 다양성을 늘린다.
 *
 * destroyAll — 타깃 전부 파괴 (기본)
 * noNeutral  — 중립구에 닿으면 실패. 각을 만들던 공이 지뢰가 된다
 * carom      — 큐볼로 타깃을 직접 못 부순다. 반드시 중립구나 폭발통을 거쳐야 한다
 * inOrder    — 번호 순서대로만 파괴. 순서를 어기면 실패
 */
export type Objective = 'destroyAll' | 'noNeutral' | 'bankShot' | 'inOrder'

/**
 * 모디파이어 — 조건·테마와 **독립적으로** 붙는 변주.
 *
 * 조건(6) × 테마(9) 조합에 이 축(5)이 곱해져 주기가 90으로 늘어난다.
 * 각각은 숫자 하나를 바꾸는 것뿐이라 구현비가 거의 없는데 조합은 곱으로 늘어난다.
 *
 * swift      — 모든 공이 빠르다
 * shortLine  — 조준선이 1선분만. 정보를 줄여 난이도를 올린다
 * tightTime  — 제한 시간이 짧다
 * noSlow     — 조준해도 시간이 느려지지 않는다. 오래 재는 것 자체가 손해다
 */
export type ModifierId = 'none' | 'swift' | 'shortLine' | 'tightTime' | 'noSlow'

/** 큐볼만 통과한다. 양방향. */
export interface Portal {
  ax: number
  ay: number
  bx: number
  by: number
  r: number
}

export interface Body {
  id: number
  role: BodyRole
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** 0에 가까울수록 무겁다. */
  invMass: number
  /**
   * 플레이어의 타격을 물고 있는 시각(초). -1이면 없음.
   * 충전된 물체가 타깃을 치면 파괴된다 — 당구의 쿠션·연쇄에 해당한다.
   */
  chargedAt: number
  /** inOrder 조건에서 부술 순서. 1부터. */
  order?: number
  /** 충전을 물려받은 깊이. 플레이어 직격이 1. */
  depthTag?: number
  variant: number
}

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  invulnUntil: number
  /** 포탈로 나온 직후 재진입을 막는 시각(초). 무한 왕복 방지. */
  portalLockUntil: number
}

/** 예지 결과. 조준 중에는 "대시했을 때"의 미래, 평시에는 "그대로 뒀을 때"의 미래다. */
export interface Prediction {
  path: { x: number; y: number }[]
  /** 첫 충돌까지 남은 시간(초). 없으면 -1 */
  hitTime: number
  hitX: number
  hitY: number
  hitBodyId: number
  hitRole: BodyRole | null
  /**
   * 이 샷이 결국 위험물에 부딪혀 끝나는가.
   * 첫 충돌만 보면 "타깃 맞히고 튕겨서 죽는" 샷이 안전해 보인다.
   * 조준선이 그걸 숨기면 플레이어는 자기가 왜 죽었는지 알 수 없다.
   */
  dies: boolean
  dieTime: number
  dieX: number
  dieY: number
  /** 이 샷으로 부술 타깃 수. 폭발통을 노릴 때 몇 개가 쓸려나가는지 미리 보여준다. */
  destroys: number
}

export type Phase = 'playing' | 'cleared' | 'failed'

export interface StageSpec {
  index: number
  objective: Objective
  theme: ThemeId
  modifier: ModifierId
  /** 조준선을 몇 선분까지 그릴지. shortLine 모디파이어가 줄인다. */
  aimSegments: number
  targets: number
  hazards: number
  neutrals: number
  bombs: number
  portals: number

  timeLimit: number
  speed: number
}

export interface RunOptions {
  /** 코인 소모품: 시작 시간 보너스(초) */
  extraSeconds: number
}

export interface FxEvent {
  kind: 'dash' | 'destroy' | 'chain'  | 'explode' | 'warp'
  x: number
  y: number
  /** chain일 때 연쇄 깊이, explode일 때 함께 부순 타깃 수 */
  depth: number
}

export interface GameState {
  phase: Phase
  spec: StageSpec
  /** 스테이지 경과 시간(초). 조준 중에도 실제 속도로 흐른다. */
  time: number
  timeLeft: number
  rngSeed: number

  player: Player
  bodies: Body[]
  portals: Portal[]

  /** 사용한 샷 수. 제한은 없고 통계·연출용이다. */
  shotsUsed: number
  targetsLeft: number
  destroyed: number
  bestChain: number
  coins: number

  /** 조준 중이면 시간이 느려지고 조준선이 나온다. */
  aiming: boolean
  /** 누른 지점. 여기서 반대로 당긴 만큼 세게 나간다. */
  anchorX: number
  anchorY: number
  /** 현재 손가락 위치 */
  aimX: number
  aimY: number

  /** inOrder 조건에서 다음에 부숴야 하는 번호 */
  orderNext: number

  nextId: number
  fx: FxEvent[]

  usedRevive: boolean
  usedConsumable: boolean
}

/** 포인터 입력. 누름·이동·뗌을 그대로 시뮬레이션에 넘긴다. */
export type Input =
  | { type: 'aim'; x: number; y: number }
  | { type: 'move'; x: number; y: number }
  | { type: 'release'; x: number; y: number }
