import { useCallback, useRef, useState } from 'react'
import { useGameServer } from '@agent8/gameserver'
import { loadNickname, saveNickname, submitProgress, type RemoteServer } from '../net/leaderboard'

/**
 * 랭킹 자동 등록.
 *
 * 스테이지를 깰 때마다 바로 올린다. 따로 "등록" 버튼을 누르게 하면
 * 안 누른 사람의 기록이 통째로 빠져서 랭킹이 실제 실력 분포를 못 보여준다.
 *
 * 닉네임이 없으면 계정에서 하나 만들어 쓴다 — 이름을 정하기 전에는 못 오르는 구조면
 * 자동 등록이라고 할 수 없다. 이름은 나중에 랭킹 창에서 바꿀 수 있고,
 * 바꾸면 이미 올라간 기록의 이름도 같이 바뀐다.
 */

/** 계정에서 만드는 기본 이름. 같은 계정이면 항상 같은 값이 나온다. */
export function autoNickname(account: string): string {
  const tail = account.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()
  return tail ? `PLAYER-${tail}` : 'PLAYER'
}

export function useRanking() {
  const { connected, server, account } = useGameServer()
  const remote = server as unknown as RemoteServer | undefined

  const [stored, setStored] = useState(() => loadNickname())
  const nickname = stored || (account ? autoNickname(account) : '')

  // 같은 스테이지를 두 번 올리지 않는다. 서버도 막지만 요청 자체를 아낀다.
  const sent = useRef(-1)

  const submit = useCallback(
    (stage: number) => {
      if (!connected || !remote || !nickname) return
      if (stage <= sent.current) return
      sent.current = stage
      void submitProgress(remote, stage, nickname)
    },
    [connected, remote, nickname],
  )

  /** 이름 변경. 이미 올라간 기록의 이름도 갱신되도록 지금 도달 스테이지로 다시 올린다. */
  const rename = useCallback(
    async (name: string, currentStage: number) => {
      const trimmed = name.trim()
      if (!trimmed) return
      saveNickname(trimmed)
      setStored(trimmed)
      if (!connected || !remote) return
      await submitProgress(remote, currentStage, trimmed)
    },
    [connected, remote],
  )

  return { nickname, submit, rename }
}
