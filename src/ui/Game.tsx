import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameLoop } from '../hooks/useGameLoop'
import Coin from './Coin'
import type { ModifierId, Objective, RunOptions } from '../game/types'
import type { SpriteName } from '../game/assets'
import { CONTINUE_SECONDS, continueCost } from '../shop'
import { ADS_ENABLED } from '../features'
import { PLACEMENT } from '../net/ads'
import { useAdReward } from '../hooks/useAdReward'
import Tutorial from './Tutorial'
import { markTutorialSeen, tutorialSeen } from '../tutorial'

/** 모디파이어는 규칙이 아니라 이번 판의 조건 변화라 짧게만 알린다. */
const MODIFIER_LABEL: Record<ModifierId, string> = {
  none: '',
  swift: '공이 빠름',
  shortLine: '조준선 짧음',
  tightTime: '시간 촉박',
  noSlow: '조준해도 안 느려짐',
}

/** 조건은 규칙이 아니라 "지금 지켜야 할 것"으로 읽혀야 하므로 명령형으로 쓴다. */
const OBJECTIVE_LABEL: Record<Objective, string> = {
  destroyAll: '',
  noNeutral: '회색 공에 닿으면 실패',
  bankShot: '직접 못 부숨 · 한 번 튕겨서',
  inOrder: '번호 순서대로만',
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
  skin,
}: Props) {
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
          {hud.objective !== 'destroyAll' && (
            <span className="objective">{OBJECTIVE_LABEL[hud.objective]}</span>
          )}
          {hud.modifier !== 'none' && (
            <span className="objective mod">{MODIFIER_LABEL[hud.modifier]}</span>
          )}
        </div>
        <div className="hud-row sub">
          <span className={lowTime ? 'timer low' : 'timer'}>{hud.timeLeft.toFixed(1)}s</span>
          <span className="targets">
            타깃 {hud.totalTargets - hud.targetsLeft}/{hud.totalTargets}
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
          {hud.modifier === 'noSlow'
            ? '이번 판은 안 느려짐 · 반대로 당겼다 떼면 발사'
            : '누르면 느려짐 · 반대로 당겼다 떼면 발사'}
        </div>
      )}

      {/* 첫 판 내내 색 규칙을 옆에 붙여둔다. 카드를 닫는 순간 잊어버리기 때문이다. */}
      {hud.stage === 1 && hud.phase === 'playing' && !tutorial && (
        <div className="tut-legend inplay">
          <span>
            <i style={{ background: '#4de1ff' }} />
            빗나감
          </span>
          <span>
            <i style={{ background: '#ffc94d' }} />
            부순다
          </span>
          <span>
            <i style={{ background: '#ff4d5e' }} />
            실패
          </span>
        </div>
      )}

      {cleared && (
        <div className="overlay">
          <h1 className="ok">STAGE CLEAR</h1>
          {noAds && <p className="meta">코인 2배 적용</p>}
          <div className="buttons">
            {ADS_ENABLED && !noAds && !ad.hidden && (
              <button
                className="ghost"
                disabled={ad.pending || doubled || hud.coins === 0}
                onClick={watchForCoins}
              >
                {doubled ? '코인 2배 받음' : ad.pending ? '광고 보는 중…' : '광고 보고 코인 2배'}
              </button>
            )}
            {/* 등록은 클리어와 동시에 이미 끝났다. 여기서는 보기만 한다. */}
            <button className="ghost" onClick={() => onOpenRanking(hud.stage)}>
              랭킹 보기
            </button>
            <button
              className="primary"
              onClick={() => {
                recorded.current = -1
                nextStage()
              }}
            >
              다음 스테이지
            </button>
          </div>
          {ad.message && <p className="ad-note">{ad.message}</p>}
          <button className="link" onClick={onQuit}>
            타이틀로
          </button>
        </div>
      )}

      {failed && (
        <div className="overlay">
          <h1>FAILED</h1>
          <p className="meta">
            타깃 {hud.totalTargets - hud.targetsLeft}/{hud.totalTargets} 파괴
          </p>
          <div className="buttons">
            {hud.canRevive && (noAds || (ADS_ENABLED && !ad.hidden)) && (
              <button className="ghost" disabled={ad.pending} onClick={watchForRevive}>
                {noAds
                  ? `시간 +${CONTINUE_SECONDS}초`
                  : ad.pending
                    ? '광고 보는 중…'
                    : `광고 보고 시간 +${CONTINUE_SECONDS}초`}
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
                코인 {continueCost(hud.stage)}으로 이어하기
              </button>
            )}
            <button className="primary" onClick={retry}>
              다시하기
            </button>
          </div>
          {ad.message && <p className="ad-note">{ad.message}</p>}
          <button className="link" onClick={onQuit}>
            타이틀로
          </button>
        </div>
      )}
    </div>
  )
}
