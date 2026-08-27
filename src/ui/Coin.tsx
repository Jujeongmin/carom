interface Props {
  amount: number
  /** 이번에 벌어들인 양임을 드러낸다. 잔액과 획득량이 같은 모양이면 구분이 안 된다. */
  plus?: boolean
}

/** 코인 표시. ◎ 문자 대신 아이콘을 쓴다 — 이미 만들어둔 에셋이 안 쓰이고 있었다. */
export default function Coin({ amount, plus }: Props) {
  return (
    <span className="coins">
      <img className="coin-icon" src="/assets/icon_coin.webp" alt="" />
      {plus ? '+' : ''}
      {amount.toLocaleString()}
    </span>
  )
}
