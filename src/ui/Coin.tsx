/** 코인 표시. ◎ 문자 대신 아이콘을 쓴다 — 이미 만들어둔 에셋이 안 쓰이고 있었다. */
export default function Coin({ amount }: { amount: number }) {
  return (
    <span className="coins">
      <img className="coin-icon" src="/assets/icon_coin.webp" alt="코인" />
      {amount.toLocaleString()}
    </span>
  )
}
