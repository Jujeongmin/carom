import { PALETTE } from '../game/config'
import { t, useLang } from '../i18n'

interface Props {
  onClose: () => void
}

/**
 * 첫 판 튜토리얼.
 *
 * 이 게임에서 유일하게 배워야 하는 것은 **조준선 색이 무슨 뜻인가**이다.
 * 색 규칙을 모르면 선이 그냥 예쁜 장식으로 보이고, 그러면 이 게임은
 * 그냥 손가락으로 공을 튕기는 운 게임이 된다.
 *
 * 색은 렌더러와 같은 출처(PALETTE)에서 가져온다 — 설명과 화면이 다른 색이면
 * 튜토리얼이 거짓말을 하는 셈이다.
 *
 * 읽는 동안 제한 시간이 흐르면 안 되므로 이 카드가 떠 있는 동안 루프를 멈춘다.
 */
export default function Tutorial({ onClose }: Props) {
  useLang()
  return (
    <div className="overlay tutorial-wrap">
      <div className="board tutorial" onClick={(e) => e.stopPropagation()}>
        <h2 className="board-title">STAGE 1</h2>

        <ol className="tut-steps">
          <li>
            <strong>{t('tut.s1.title')}</strong>
            <span>{t('tut.s1.body')}</span>
          </li>
          <li>
            <strong>{t('tut.s2.title')}</strong>
            <span>{t('tut.s2.body')}</span>
          </li>
          <li>
            <strong>{t('tut.s3.title')}</strong>
            <span>{t('tut.s3.body')}</span>
          </li>
        </ol>

        <div className="tut-legend">
          <span>
            <i style={{ background: PALETTE.aim }} />
            {t('legend.miss')}
          </span>
          <span>
            <i style={{ background: PALETTE.target }} />
            {t('legend.break')}
          </span>
          <span>
            <i style={{ background: '#ff8c3c' }} />
            {t('legend.chain')}
          </span>
          <span>
            <i style={{ background: PALETTE.hazard }} />
            {t('legend.failHere')}
          </span>
        </div>

        <button className="primary board-close" onClick={onClose}>
          {t('title.start')}
        </button>
      </div>
    </div>
  )
}
