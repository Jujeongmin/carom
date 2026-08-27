import type { Progress } from '../progress'
import Coin from './Coin'

interface Props {
  progress: Progress
  onStart: (stage: number) => void
  onOpenRanking: () => void
  onOpenShop: () => void
}

export default function Title({ progress, onStart, onOpenRanking, onOpenShop }: Props) {
  const hasProgress = progress.reached > 1

  return (
    <div className="title">
      <div className="title-body">
        <img className="title-logo" src="/assets/logo_title.webp" alt="CAROM" />

        {/*
          코인은 진행 여부와 무관하게 항상 보여야 한다.
          진행이 없다고 통계 줄을 통째로 숨기면, 코인을 갖고 있어도 없는 것처럼 보인다.
        */}
        <div className="title-stats">
          {hasProgress ? `스테이지 ${progress.reached - 1} 클리어` : '누르고 반대로 당겼다 떼면 발사'}
        </div>
        <Coin amount={progress.coins} />

        <div className="title-buttons">
          {hasProgress && (
            <button className="primary" onClick={() => onStart(progress.reached)}>
              이어하기 · STAGE {progress.reached}
            </button>
          )}
          <button className={hasProgress ? 'ghost' : 'primary'} onClick={() => onStart(1)}>
            {hasProgress ? '처음부터' : '시작'}
          </button>
          <button className="menu" onClick={onOpenShop}>
            <img src="/assets/icon_vx.webp" alt="" />
            상점
          </button>
          <button className="menu" onClick={onOpenRanking}>
            <img src="/assets/icon_rank.webp" alt="" />
            랭킹
          </button>
        </div>
      </div>
    </div>
  )
}
