import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameLoop } from '../hooks/useGameLoop'
import Coin from './Coin'
import type { ModifierId, Objective, RunOptions } from '../game/types'
import type { SpriteName } from '../game/assets'
import { continueCost } from '../shop'
import { ADS_ENABLED } from '../features'
import { PLACEMENT } from '../net/ads'
import { useAdReward } from '../hooks/useAdReward'
import Tutorial from './Tutorial'
import { markTutorialSeen, tutorialSeen } from '../tutorial'
import { t, useLang } from '../i18n'
import type { StringKey } from '../i18n'

/** 모디파이어는 규칙이 아니라 이번 판의 조건 변화라 짧게만 알린다. */
const MODIFIER_KEY: Record<ModifierId, StringKey | null> = {
  none: null,
  swift: 'mod.swift',
  shortLine: 'mod.shortLine',
  tightTime: 'mod.tightTime',
  noSlow: 'mod.noSlow',
}

/** 조건은 규칙이 아니라 "지금 지켜야 할 것"으로 읽혀야 하므로 명령형으로 쓴다. */
const OBJECTIVE_KEY: Record<Objective, StringKey | null> = {
  destroyAll: null,
  noNeutral: 'obj.noNeutral',
  bankShot: 'obj.bankShot',
  inOrder: 'obj.inOrder',
}

interface Props {
  startStage: number
  onCleared: (stage: number, coins: number) => void
  onOpenRanking: (stage: number) => void
  /** 지갑 잔액. 이어하기를 살 수 있는지 판단한다(스테이지 안에서 번 hud.coins와 다르다). */
  coins: number
  /** 코인으로 이어하기. 결제가 실제로 됐을 때만 true — 실패하면 이어하지 않는다. */
  onBuyContinue: (cost: number) => Promise<boolean>
  /** 광고로 코인 2배를 받았을 때. 서버가 지급을 끝내고 돌려준 지갑이 들어온다. */
  onDoubleCoins: (wallet: unknown) => void
  /**
   * 광고 제거를 샀는가.
   * 코인 2배는 적립 시점에 이미 들어가므로 그 버튼은 사라진다 — 또 주면 4배가 된다.
   * 부활은 버튼을 남기되 광고 없이 바로 준다. 돈 낸 사람이 기능을 잃으면 안 된다.
   */
  noAds: boolean
  /** 서버가 적립할 때 곱하는 배율. 화면에 보여줄 획득량을 서버와 같은 식으로 계산한다. */
  coinBoost: number
  skin: SpriteName
  onQuit: () => void
}

export default function Game({
  startStage,
  onCleared,
  onQuit,
  onOpenRanking,
  coins,
  onBuyContinue,
  onDoubleCoins,
  noAds,
  coinBoost,
  skin,
}: Props) {
  useLang()
  const runOptions = useMemo<RunOptions>(() => ({ extraSeconds: 0 }), [])

  // 첫 판에서 한 번만. 다시 볼 필요가 없는 것을 매 재시도마다 띄우면 방해가 된다.
  const [tutorial, setTutorial] = useState(() => startStage === 1 && !tutorialSeen())
  const { canvasRef, hud, retry, nextStage, revive } = useGameLoop(
    runOptions,
    startStage,
    skin,
    tutorial,
  )
  const ad = useAdReward()

  // 광고는 보상이 실제로 확인됐을 때만 반영한다. 중간에 닫으면 아무 일도 일어나지 않는다.
  const [doubled, setDoubled] = useState(false)
  const [buying, setBuying] = useState(false)
  const watchForCoins = async () => {
    const res = await ad.watch(PLACEMENT.doubleCoins, hud.coins)
    if (res.ok) {
      setDoubled(true)
      onDoubleCoins(res.wallet)
    }
  }
  const watchForRevive = async () => {
    if (noAds) {
      revive()
      return
    }
    if ((await ad.watch(PLACEMENT.revive)).ok) revive()
  }

  /**
   * 이번 판에서 실제로 지갑에 들어가는 코인.
   *
   * 서버가 하는 계산을 그대로 따라 한다:
   *   recordClear     → floor(번 코인 × coinBoost)   (광고 제거를 사면 coinBoost가 2)
   *   redeemAdReward  → 코인 2배 광고를 봤으면 번 코인만큼 한 번 더
   * 두 경로는 서로 배타적이다(서버가 noAds 계정의 광고 보상을 already_doubled로 거절한다).
   *
   * 배율을 여기서 2라고 박아두지 않는다 — 서버 표가 바뀌면 화면이 거짓말을 하게 된다.
   */
  const reward = Math.floor(hud.coins * coinBoost) + (doubled ? hud.coins : 0)
  const mult = hud.coins > 0 ? reward / hud.coins : 1

  const cleared = hud.phase === 'cleared'
  const failed = hud.phase === 'failed'
  const lowTime = hud.timeLeft <= 5

  // 클리어는 한 번만 기록한다. HUD는 매 프레임 갱신되므로 중복 호출을 막아야 한다.
  const recorded = useRef(-1)
  useEffect(() => {
    if (!cleared || recorded.current === hud.stage) return
    recorded.current = hud.stage
    onCleared(hud.stage, hud.coins)
  }, [cleared, hud.stage, hud.coins, onCleared])

  return (
    <div className="app">
      <canvas ref={canvasRef} className="stage" />

      <div className="hud">
        <div className="hud-row">
          <span className="stage-no">STAGE {hud.stage}</span>
          <Coin amount={hud.coins} />
        </div>
        <div className="badges">
          {OBJECTIVE_KEY[hud.objective] && (
            <span className="objective">{t(OBJECTIVE_KEY[hud.objective]!)}</span>
          )}
          {MODIFIER_KEY[hud.modifier] && (
            <span className="objective mod">{t(MODIFIER_KEY[hud.modifier]!)}</span>
          )}
        </div>
        <div className="hud-row sub">
          <span className={lowTime ? 'timer low' : 'timer'}>{hud.timeLeft.toFixed(1)}s</span>
          <span className="targets">
            {t('game.targets', { a: hud.totalTargets - hud.targetsLeft, b: hud.totalTargets })}
          </span>
        </div>
      </div>

      {tutorial && (
        <Tutorial
          onClose={() => {
            markTutorialSeen()
            setTutorial(false)
          }}
        />
      )}

      {hud.phase === 'playing' && !hud.aiming && !tutorial && (
        <div className="hint">
          {hud.modifier === 'noSlow' ? t('game.hintNoSlow') : t('game.hint')}
        </div>
      )}

      {/* 첫 판 내내 색 규칙을 옆에 붙여둔다. 카드를 닫는 순간 잊어버리기 때문이다. */}
      {hud.stage === 1 && hud.phase === 'playing' && !tutorial && (
        <div className="tut-legend inplay">
          <span>
            <i style={{ background: '#4de1ff' }} />
            {t('legend.miss')}
          </span>
          <span>
            <i style={{ background: '#ffc94d' }} />
            {t('legend.break')}
          </span>
          <span>
            <i style={{ background: '#ff4d5e' }} />
            {t('legend.fail')}
          </span>
        </div>
      )}

      {cleared && (
        <div className="overlay">
          <h1 className="ok">STAGE CLEAR</h1>

          {/*
            깨고 얼마를 받았는지 보여준다. 이게 없으면 코인이 늘어난 것을
            타이틀로 돌아가서야 알게 되고, "코인 2배" 광고를 볼 이유도 안 보인다.
          */}
          <div className="reward">
            <span className="reward-label">{t('game.reward')}</span>
            <Coin amount={reward} plus />
            {mult > 1 && (
              <span className="reward-mult">
                ×{Number.isInteger(mult) ? mult : mult.toFixed(1)}
              </span>
            )}
          </div>
          <div className="buttons">
            {ADS_ENABLED && !noAds && !ad.hidden && (
              <button
                className="ghost"
                disabled={ad.pending || doubled || hud.coins === 0}
                onClick={watchForCoins}
              >
                {doubled
                  ? t('game.adDoubleDone')
                  : ad.pending
                    ? t('game.adLoading')
                    : t('game.adDouble')}
              </button>
            )}
            {/* 등록은 클리어와 동시에 이미 끝났다. 여기서는 보기만 한다. */}
            <button className="ghost" onClick={() => onOpenRanking(hud.stage)}>
              {t('game.viewRank')}
            </button>
            <button
              className="primary"
              onClick={() => {
                recorded.current = -1
                nextStage()
              }}
            >
              {t('game.next')}
            </button>
          </div>
          {ad.message && <p className="ad-note">{ad.message}</p>}
          <button className="link" onClick={onQuit}>
            {t('game.toTitle')}
          </button>
        </div>
      )}

      {failed && (
        <div className="overlay">
          <h1>FAILED</h1>
          <p className="meta">
            {t('game.destroyed', { a: hud.totalTargets - hud.targetsLeft, b: hud.totalTargets })}
          </p>
          <div className="buttons">
            {hud.canRevive && (noAds || (ADS_ENABLED && !ad.hidden)) && (
              <button className="ghost" disabled={ad.pending} onClick={watchForRevive}>
                {noAds ? t('game.revive') : ad.pending ? t('game.adLoading') : t('game.adRevive')}
              </button>
            )}
            {hud.canRevive && coins >= continueCost(hud.stage) && (
              <button
                className="ghost"
                disabled={buying}
                onClick={async () => {
                  setBuying(true)
                  const paid = await onBuyContinue(continueCost(hud.stage))
                  setBuying(false)
                  // 서버가 잔액 부족으로 거절할 수 있다. 그때 이어하면 공짜가 된다.
                  if (paid) revive()
                }}
              >
                {t('game.buyContinue', { n: continueCost(hud.stage) })}
              </button>
            )}
            <button className="primary" onClick={retry}>
              {t('game.retry')}
            </button>
          </div>
          {ad.message && <p className="ad-note">{ad.message}</p>}
          <button className="link" onClick={onQuit}>
            {t('game.toTitle')}
          </button>
        </div>
      )}
    </div>
  )
}
