/**
 * 리더보드 클라이언트.
 *
 * 서버 호출을 이 파일 하나에 가둔다. UI는 서버 SDK를 직접 모른다.
 * 서버가 없거나 연결이 안 된 상태(로컬 개발, 배포 전)에서도 게임은 그대로 돌아가야 하므로
 * 모든 호출이 실패를 값으로 돌려준다 — 예외를 밖으로 던지지 않는다.
 */

/** 전체 랭킹 항목 — 도달 스테이지 */
export interface RankEntry {
  __id?: string
  account: string
  nickname: string
  stage: number
  updatedAt?: number
}

export interface Ranked<T> {
  entry: T | null
  rank: number
}

/** useGameServer가 주는 server 객체. SDK 타입을 UI까지 끌고 오지 않으려고 최소한만 정의한다. */
export interface RemoteServer {
  remoteFunction: (name: string, args?: unknown[]) => Promise<unknown>
}

async function call<T>(server: RemoteServer, fn: string, args: unknown[], fallback: T): Promise<T> {
  try {
    return ((await server.remoteFunction(fn, args)) as T) ?? fallback
  } catch (e) {
    console.warn(`[leaderboard] ${fn} failed`, e)
    return fallback
  }
}

export function submitProgress(server: RemoteServer, stage: number, nickname: string) {
  return call(server, 'submitProgress', [stage, nickname], null)
}

export function fetchTop(server: RemoteServer) {
  return call<RankEntry[]>(server, 'getTopRankings', [], [])
}

export function fetchMyRank(server: RemoteServer) {
  return call<Ranked<RankEntry>>(server, 'getMyRank', [], { entry: null, rank: -1 })
}

// ─────────────── 닉네임 ───────────────

const NICK_KEY = 'carom.nickname.v1'

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(name: string): void {
  try {
    localStorage.setItem(NICK_KEY, name)
  } catch {
    // 저장 실패로 플레이를 막지 않는다
  }
}
