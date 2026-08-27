import type { Progress } from '../progress'
import { t, useLang } from '../i18n'
import Coin from './Coin'
import LangSwitch from './LangSwitch'

interface Props {
  progress: Progress
  onStart: (stage: number) => void
  onOpenRanking: () => void
  onOpenShop: () => void
}

export default function Title({ progress, onStart, onOpenRanking, onOpenShop }: Props) {
  // 언어가 바뀌면 이 화면부터 다시 그려야 한다. t()는 값을 읽을 뿐 구독하지 않는다.
  useLang()
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
          {hasProgress
            ? t('title.cleared', { n: progress.reached - 1 })
            : t('title.firstHint')}
        </div>
        <Coin amount={progress.coins} />

        {/*
          한 판이라도 깼으면 시작 버튼은 하나다.
          순위가 최고 도달 스테이지라 1스테이지로 되돌아갈 이유가 없고,
          "처음부터"를 남겨두면 눌러서 얻을 것이 없는 선택지를 계속 보여주게 된다.
        */}
        <div className="title-buttons">
          <button className="primary" onClick={() => onStart(hasProgress ? progress.reached : 1)}>
            {hasProgress ? t('title.continue', { n: progress.reached }) : t('title.start')}
          </button>
          <button className="menu" onClick={onOpenShop}>
            <img src="/assets/icon_vx.webp" alt="" />
            {t('title.shop')}
          </button>
          <button className="menu" onClick={onOpenRanking}>
            <img src="/assets/icon_rank.webp" alt="" />
            {t('title.rank')}
          </button>
        </div>

        <LangSwitch />
      </div>
    </div>
  )
}
