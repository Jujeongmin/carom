/**
 * 진행 저장 — **오프라인 전용**.
 *
 * 서버에 연결되면 지갑은 서버가 소유한다(useWallet). 이 파일은 서버가 없을 때만 쓰인다:
 * 로컬 개발, 연결 실패, Verse8 밖에서 연 경우. 서버가 없다고 게임이 안 돌아가면 안 된다.
 *
 * 여기 있는 값은 신뢰 대상이 아니다. localStorage는 고치면 그만이라
 * 실제 결제와 랭킹이 걸린 값은 전부 서버가 정한다.
 * 처음 연결될 때 migrateLocal로 한 번만 올라가고, 그 뒤로는 서버 값이 이긴다.
 */

const KEY = 'carom.progress.v1'

export interface Progress {
  /** 도달한 최고 스테이지 (플레이 가능한 가장 높은 번호) */
  reached: number
  coins: number
  /** 구매한 스킨 id */
  owned: string[]
  /** 착용 중인 스킨 id */
  equipped: string
}

const EMPTY: Progress = {
  reached: 1,
  coins: 0,
  owned: ['base'],
  equipped: 'base',
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY, owned: [...EMPTY.owned] }
    const p = JSON.parse(raw) as Partial<Progress>
    const owned = Array.isArray(p.owned) ? p.owned : []
    return {
      reached: Math.max(1, Math.floor(p.reached ?? 1)),
      coins: Math.max(0, Math.floor(p.coins ?? 0)),
      // 기본 스킨은 항상 보유한다. 저장이 깨져도 큐볼이 안 보이는 일은 없어야 한다.
      owned: owned.includes('base') ? owned : ['base', ...owned],
      equipped: p.equipped ?? 'base',
    }
  } catch {
    // 저장소가 막혀 있거나 깨졌으면 진행을 잃을 뿐 게임은 돌아가야 한다
    return { ...EMPTY, owned: [...EMPTY.owned] }
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // 무시. 저장 실패로 플레이를 막지 않는다.
  }
}

/** 스테이지를 깼을 때 진행을 갱신한다. */
export function recordClear(p: Progress, stage: number, coins: number): Progress {
  const next: Progress = {
    ...p,
    reached: Math.max(p.reached, stage + 1),
    coins: p.coins + coins,
  }
  saveProgress(next)
  return next
}

/** 코인을 쓴다. 모자라면 아무 일도 일어나지 않고 null을 돌려준다. */
export function spendCoins(p: Progress, amount: number): Progress | null {
  if (p.coins < amount) return null
  const next = { ...p, coins: p.coins - amount }
  saveProgress(next)
  return next
}

export function buySkin(p: Progress, id: string, price: number): Progress | null {
  if (p.owned.includes(id)) return null
  const next = spendCoins(p, price)
  if (!next) return null
  const withSkin = { ...next, owned: [...next.owned, id], equipped: id }
  saveProgress(withSkin)
  return withSkin
}

export function equipSkin(p: Progress, id: string): Progress {
  if (!p.owned.includes(id)) return p
  const next = { ...p, equipped: id }
  saveProgress(next)
  return next
}
