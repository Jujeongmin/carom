import { PALETTE } from '../game/config'

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
  return (
    <div className="overlay tutorial-wrap">
      <div className="board tutorial" onClick={(e) => e.stopPropagation()}>
        <h2 className="board-title">STAGE 1</h2>

        <ol className="tut-steps">
          <li>
            <strong>당겼다 떼면 발사</strong>
            <span>화면을 누른 채 가고 싶은 방향의 반대로 당긴다. 멀리 당길수록 세게 나간다.</span>
          </li>
          <li>
            <strong>선은 결과를 미리 보여준다</strong>
            <span>떼기 전에 공이 어디로 튀고 무엇을 부수는지 그대로 나온다.</span>
          </li>
          <li>
            <strong>금색 물체를 전부 부수면 클리어</strong>
            <span>제한 시간 안에. 가만히 있어서 깨지는 판은 없다.</span>
          </li>
        </ol>

        <div className="tut-legend">
          <span>
            <i style={{ background: PALETTE.aim }} />
            빗나감
          </span>
          <span>
            <i style={{ background: PALETTE.target }} />
            부순다
          </span>
          <span>
            <i style={{ background: '#ff8c3c' }} />
            폭발 연쇄
          </span>
          <span>
            <i style={{ background: PALETTE.hazard }} />
            여기서 실패
          </span>
        </div>

        <button className="primary board-close" onClick={onClose}>
          시작
        </button>
      </div>
    </div>
  )
}
