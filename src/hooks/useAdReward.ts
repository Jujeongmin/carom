import { useCallback, useState } from 'react'
import { useGameServer } from '@agent8/gameserver'
import { PLACEMENT, adsUnsupported, showRewarded, type PlacementId } from '../net/ads'
import type { RemoteServer } from '../net/leaderboard'

/**
 * 광고 보상 한 번 받기.
 *
 * 보상의 가치에 따라 검증 수준을 나눈다 — 문서의 권장을 그대로 따른다.
 *
 *   revive      — 그 판을 이어할 뿐이라 재화가 아니다. 클라이언트 status로 충분하다.
 *   doubleCoins — 코인은 상점에서 쓰는 재화다. 서버에 requestId를 확인시키고,
 *                 서버가 (계정, requestId)를 기록해 같은 시청의 재사용을 막는다.
 *
 * 코인은 **서버가 직접 지급하고 지갑을 돌려준다**. 클라이언트가 "이만큼 넣어라"라고
 * 시키지 않는다. 그래서 남는 구멍은 "그 판에서 정말 그만큼 벌었는가" 하나뿐이고,
 * 그건 서버가 시뮬레이션을 재현하지 않는 한 못 막는다 —
 * 대신 서버가 스테이지당 상한(MAX_COINS_PER_STAGE)으로 무제한 발급만 잘라낸다.
 */

export interface AdResult {
  ok: boolean
  /** 서버가 지급을 끝내고 돌려준 지갑(코인 2배일 때만). */
  wallet?: unknown
}
export function useAdReward() {
  const { connected, server } = useGameServer()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const remote = server as unknown as RemoteServer | undefined

  const watch = useCallback(
    async (placement: PlacementId, earnedThisStage = 0): Promise<AdResult> => {
      if (pending) return { ok: false }
      setPending(true)
      setMessage(null)
      try {
        const outcome = await showRewarded(placement)

        if (!outcome.ok) {
          // 사용자가 스스로 닫은 것은 실패가 아니다. 굳이 알리지 않는다.
          if (outcome.reason !== 'dismissed') setMessage(outcome.message)
          return { ok: false }
        }

        // 재화가 아닌 보상은 여기서 끝. 서버를 거칠 이유가 없다.
        if (placement !== PLACEMENT.doubleCoins) return { ok: true }

        if (!connected || !remote) {
          setMessage('서버에 연결되지 않아 보상을 받을 수 없습니다')
          return { ok: false }
        }

        try {
          const res = (await remote.remoteFunction('redeemAdReward', [
            outcome.requestId,
            placement,
            earnedThisStage,
          ])) as { granted?: boolean; reason?: string; wallet?: unknown }

          if (!res?.granted) {
            setMessage(
              res?.reason === 'already_granted'
                ? '이미 받은 보상입니다'
                : '보상을 확인하지 못했습니다',
            )
            return { ok: false }
          }
          return { ok: true, wallet: res.wallet }
        } catch (e) {
          console.warn('[ads] redeem failed', e)
          setMessage('보상을 확인하지 못했습니다')
          return { ok: false }
        }
      } finally {
        setPending(false)
      }
    },
    [connected, remote, pending],
  )

  return { watch, pending, message, clearMessage: () => setMessage(null), hidden: adsUnsupported() }
}
