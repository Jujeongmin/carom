import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameServer } from '@agent8/gameserver'
import type { RemoteServer } from '../net/leaderboard'
import {
  buySkin as buySkinLocal,
  equipSkin as equipSkinLocal,
  loadProgress,
  recordClear as recordClearLocal,
  saveProgress,
  spendCoins as spendCoinsLocal,
  type Progress,
} from '../progress'

/**
 * 지갑 하나.
 *
 * 서버에 연결되면 **서버가 권위**다. 코인·보유 스킨·도달 스테이지를 서버가 정하고
 * 클라이언트는 결과를 표시만 한다. 실제 결제(VX)가 얽힌 이상 클라이언트가 재화를
 * 소유하는 구조는 둘 수 없다 — localStorage는 고치면 그만이다.
 *
 * 연결이 안 되면 로컬로 돌아간다. 서버가 없다고 게임이 안 돌아가면 안 되기 때문이다.
 * 대신 그때 번 코인은 그 기기에만 남고, 처음 연결될 때 한 번 올라간다(migrateLocal).
 */
export interface Wallet extends Progress {
  /** 코인 배율. 서버가 적립할 때 곱한다. 광고 제거를 사면 2. */
  coinBoost: number
  /** 광고 제거를 샀는가. 광고를 띄우지 않고, 보상은 그냥 준다. */
  noAds: boolean
}

const OFFLINE_BOOST = 1

function toWallet(p: Progress, coinBoost = OFFLINE_BOOST, noAds = false): Wallet {
  return { ...p, coinBoost, noAds }
}

export interface WalletApi {
  wallet: Wallet
  /** 서버가 권위를 쥐고 있는가. false면 이 기기에만 남는 진행이다. */
  online: boolean
  recordClear: (stage: number, coins: number) => void
  spend: (amount: number, reason: string) => Promise<boolean>
  buySkin: (id: string, price: number) => Promise<void>
  equipSkin: (id: string) => Promise<void>
  /** 서버가 이미 지급한 지갑으로 교체한다(광고 코인 2배). */
  applyServerWallet: (w: unknown) => void
  refresh: () => Promise<void>
}

export function useWallet(): WalletApi {
  const { connected, server } = useGameServer()
  const remote = server as unknown as RemoteServer | undefined
  const online = connected && !!remote

  const [wallet, setWallet] = useState<Wallet>(() => toWallet(loadProgress()))

  // 마이그레이션은 계정당 서버가 한 번만 받아주지만, 재연결마다 요청을 던질 이유는 없다.
  const migrated = useRef(false)

  const call = useCallback(
    async (fn: string, args: unknown[]): Promise<unknown | null> => {
      if (!remote) return null
      try {
        return await remote.remoteFunction(fn, args)
      } catch (e) {
        console.warn(`[wallet] ${fn} failed`, e)
        return null
      }
    },
    [remote],
  )

  const applyServerWallet = useCallback((w: unknown) => {
    if (!w || typeof w !== 'object') return
    const s = w as Partial<Wallet>
    if (typeof s.coins !== 'number') return
    setWallet({
      coins: s.coins,
      reached: Math.max(1, Math.floor(s.reached ?? 1)),
      owned: Array.isArray(s.owned) ? s.owned : ['base'],
      equipped: typeof s.equipped === 'string' ? s.equipped : 'base',
      coinBoost: typeof s.coinBoost === 'number' && s.coinBoost > 1 ? s.coinBoost : 1,
      noAds: s.noAds === true,
    })
  }, [])

  const refresh = useCallback(async () => {
    const w = await call('getWallet', [])
    applyServerWallet(w)
  }, [call, applyServerWallet])

  // 연결되면 서버 지갑으로 갈아탄다. 그 전에 이 기기의 진행을 한 번 올린다.
  useEffect(() => {
    if (!online) return
    let alive = true
    void (async () => {
      if (!migrated.current) {
        migrated.current = true
        const local = loadProgress()
        // 아무것도 안 한 새 기기면 굳이 올릴 것이 없다.
        if (local.reached > 1 || local.coins > 0 || local.owned.length > 1) {
          const res = await call('migrateLocal', [local.reached, local.coins, local.owned])
          const r = res as { wallet?: unknown } | null
          if (alive && r?.wallet) {
            applyServerWallet(r.wallet)
            return
          }
        }
      }
      if (alive) await refresh()
    })()
    return () => {
      alive = false
    }
  }, [online, call, refresh, applyServerWallet])

  const recordClear = useCallback(
    (stage: number, coins: number) => {
      if (online) {
        // 서버 응답을 기다리는 동안 화면이 멈추면 안 된다. 낙관적으로 올리고 실제 값으로 덮는다.
        setWallet((w) => ({ ...w, coins: w.coins + Math.floor(coins * w.coinBoost), reached: Math.max(w.reached, stage + 1) }))
        void call('recordClear', [stage, coins]).then(applyServerWallet)
        return
      }
      setWallet((w) => toWallet(recordClearLocal(w, stage, coins), w.coinBoost, w.noAds))
    },
    [online, call, applyServerWallet],
  )

  const spend = useCallback(
    async (amount: number, reason: string): Promise<boolean> => {
      if (online) {
        const res = (await call('spendCoins', [amount, reason])) as {
          ok?: boolean
          wallet?: unknown
        } | null
        if (!res?.ok) return false
        applyServerWallet(res.wallet)
        return true
      }
      const next = spendCoinsLocal(wallet, amount)
      if (!next) return false
      setWallet(toWallet(next, wallet.coinBoost, wallet.noAds))
      return true
    },
    [online, call, applyServerWallet, wallet],
  )

  const buySkin = useCallback(
    async (id: string, price: number) => {
      if (online) {
        // 가격은 서버 표가 정한다. price는 화면에 보여준 값일 뿐 서버로 보내지 않는다.
        const res = (await call('buySkin', [id])) as { ok?: boolean; wallet?: unknown } | null
        if (res?.ok) applyServerWallet(res.wallet)
        return
      }
      const next = buySkinLocal(wallet, id, price)
      if (next) setWallet(toWallet(next, wallet.coinBoost, wallet.noAds))
    },
    [online, call, applyServerWallet, wallet],
  )

  const equipSkin = useCallback(
    async (id: string) => {
      if (online) {
        // 착용은 즉시 보이는 편이 낫다. 서버가 거부하면 다음 refresh에서 되돌아온다.
        setWallet((w) => (w.owned.includes(id) ? { ...w, equipped: id } : w))
        void call('equipSkin', [id]).then((r) => {
          const res = r as { ok?: boolean; wallet?: unknown } | null
          if (res?.ok) applyServerWallet(res.wallet)
        })
        return
      }
      setWallet((w) => toWallet(equipSkinLocal(w, id), w.coinBoost, w.noAds))
    },
    [online, call, applyServerWallet],
  )

  // 오프라인일 때만 로컬에 남긴다. 온라인이면 서버가 이미 갖고 있다.
  useEffect(() => {
    if (!online) saveProgress(wallet)
  }, [online, wallet])

  return { wallet, online, recordClear, spend, buySkin, equipSkin, applyServerWallet, refresh }
}
