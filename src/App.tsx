import { useCallback, useState } from 'react'
import './app.css'
import Game from './ui/Game'
import Leaderboard from './ui/Leaderboard'
import Shop from './ui/Shop'
import Title from './ui/Title'
import { useRanking } from './hooks/useRanking'
import { useWallet } from './hooks/useWallet'
import { skinById } from './shop'

type Screen = { kind: 'title' } | { kind: 'game'; startStage: number }
type Modal = { kind: 'shop' } | { kind: 'rank' }

export default function App() {
  const { wallet, online, recordClear, spend, buySkin, equipSkin, applyServerWallet, refresh } =
    useWallet()
  const ranking = useRanking()

  // 클리어 하나에 두 가지가 붙는다: 지갑 적립과 랭킹 등록.
  // 등록은 여기서 자동으로 끝난다 — 유저가 따로 누를 것이 없다.
  const handleCleared = useCallback(
    (stage: number, coins: number) => {
      recordClear(stage, coins)
      ranking.submit(stage)
    },
    [recordClear, ranking],
  )

  // ?stage=N 이 있으면 타이틀을 건너뛴다. 개발 중 특정 스테이지를 바로 여는 용도.
  const [screen, setScreen] = useState<Screen>(() => {
    const q = Number(new URLSearchParams(location.search).get('stage'))
    return Number.isFinite(q) && q > 0
      ? { kind: 'game', startStage: Math.floor(q) }
      : { kind: 'title' }
  })

  // 겹쳐 뜨는 창. 열어도 뒤의 게임 상태가 유지되어야 한다.
  const [modal, setModal] = useState<Modal | null>(null)

  // 가격이 스테이지에 따라 달라지므로 살 수 있는지는 Game이 판단한다.
  // 결제 성공 여부를 돌려줘야 실패했을 때 공짜로 이어하는 일이 없다.
  const buyContinue = useCallback((cost: number) => spend(cost, 'continue'), [spend])

  return (
    <>
      {screen.kind === 'title' ? (
        <Title
          progress={wallet}
          onStart={(stage) => setScreen({ kind: 'game', startStage: stage })}
          onOpenShop={() => setModal({ kind: 'shop' })}
          onOpenRanking={() => setModal({ kind: 'rank' })}
        />
      ) : (
        <Game
          key={screen.startStage}
          startStage={screen.startStage}
          skin={skinById(wallet.equipped).sprite}
          onCleared={handleCleared}
          onQuit={() => setScreen({ kind: 'title' })}
          coins={wallet.coins}
          onBuyContinue={buyContinue}
          // 광고 코인 2배는 서버가 직접 지급한다. 클라이언트는 결과 지갑을 반영만 한다.
          onDoubleCoins={applyServerWallet}
          noAds={wallet.noAds}
          onOpenRanking={() => setModal({ kind: 'rank' })}
        />
      )}

      {modal?.kind === 'shop' && (
        <Shop
          wallet={wallet}
          online={online}
          onBuy={(id, price) => void buySkin(id, price)}
          onEquip={(id) => void equipSkin(id)}
          onRefreshWallet={() => void refresh()}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'rank' && (
        <Leaderboard
          currentStage={Math.max(1, wallet.reached - 1)}
          nickname={ranking.nickname}
          onRename={ranking.rename}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
