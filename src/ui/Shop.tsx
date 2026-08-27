import { useEffect, useState } from 'react'
import { useVXShop } from '@verse8/platform'
import { NO_ADS_PRODUCT_ID, SKINS, VX_PRODUCTS } from '../shop'
import type { Wallet } from '../hooks/useWallet'
import Coin from './Coin'

interface Props {
  wallet: Wallet
  /** 서버가 지갑을 쥐고 있는가. 아니면 이 기기에만 남는다는 것을 알려야 한다. */
  online: boolean
  onBuy: (id: string, price: number) => void
  onEquip: (id: string) => void
  /** VX 결제가 끝난 뒤 서버가 지급한 것을 다시 읽어온다. */
  onRefreshWallet: () => void
  onClose: () => void
}

type Tab = 'coin' | 'vx'

/**
 * 상점.
 *
 * 탭 두 개:
 *   코인 — 스킨. 오직 게임 안에서 번 코인으로만 산다.
 *   VX   — 실제 결제. 광고 제거 하나뿐이다.
 *          리더보드가 도달 스테이지라 진행 속도를 파는 순간 순위가 죽는다.
 *
 * 상품 목록·가격·이미지는 전부 대시보드가 준다. 여기서 임의로 만들지 않는다 —
 * 없는 상품을 그려놓으면 눌렀을 때 실패하는 버튼이 된다.
 */
export default function Shop({ wallet, online, onBuy, onEquip, onRefreshWallet, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('coin')
  const { items, isLoading, error, buyItem, refresh, onClose: onShopClose } = useVXShop()

  // 결제 창이 닫히면 서버가 이미 지급을 끝냈을 수 있다. 지갑과 재고를 다시 읽는다.
  useEffect(
    () =>
      onShopClose((payload) => {
        if (!payload.purchased) return
        onRefreshWallet()
        void refresh()
      }),
    [onShopClose, onRefreshWallet, refresh],
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="board" onClick={(e) => e.stopPropagation()}>
        <div className="shop-head">
          <h2 className="board-title">SHOP</h2>
          <Coin amount={wallet.coins} />
        </div>

        <div className="shop-tabs">
          <button
            className={tab === 'coin' ? 'shop-tab on' : 'shop-tab'}
            onClick={() => setTab('coin')}
          >
            코인
          </button>
          <button className={tab === 'vx' ? 'shop-tab on' : 'shop-tab'} onClick={() => setTab('vx')}>
            <img src="/assets/icon_vx.webp" alt="" />
            VX
          </button>
        </div>

        {tab === 'coin' ? (
          <>
            <div className="shop-list">
              {SKINS.map((s) => {
                const owned = wallet.owned.includes(s.id)
                const equipped = wallet.equipped === s.id
                const affordable = wallet.coins >= s.price
                return (
                  <div key={s.id} className={equipped ? 'shop-item on' : 'shop-item'}>
                    <img src={`/assets/${s.sprite}.webp`} alt="" />
                    <div className="shop-info">
                      <strong>{s.name}</strong>
                      <span>{s.note}</span>
                    </div>
                    {equipped ? (
                      <span className="shop-tag">착용 중</span>
                    ) : owned ? (
                      <button className="ghost small" onClick={() => onEquip(s.id)}>
                        착용
                      </button>
                    ) : (
                      <button
                        className="ghost small"
                        disabled={!affordable}
                        onClick={() => onBuy(s.id, s.price)}
                      >
                        <Coin amount={s.price} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="board-note small">
              외형만 바뀐다 · 성능 차이 없음
              <br />
              {wallet.noAds ? '광고 제거 적용 중 · 코인 2배' : '코인은 연쇄와 폭발로 얻는다'}
              {!online && (
                <>
                  <br />
                  서버에 연결되지 않음 · 이 기기에만 저장됨
                </>
              )}
            </p>
          </>
        ) : (
          <VxTab items={items} isLoading={isLoading} error={error} wallet={wallet} onBuy={buyItem} />
        )}

        <button className="primary board-close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

type VxItem = ReturnType<typeof useVXShop>['items'][number]

function VxTab({
  items,
  isLoading,
  error,
  wallet,
  onBuy,
}: {
  items: VxItem[]
  isLoading: boolean
  error: string | null
  wallet: Wallet
  onBuy: (productId: string) => void
}) {
  if (isLoading) return <p className="board-note">불러오는 중…</p>
  if (error) return <p className="board-note">상점을 불러오지 못했습니다</p>
  if (items.length === 0) return <p className="board-note">판매 중인 상품이 없습니다</p>

  return (
    <>
      <div className="shop-list">
        {items.map((it) => {
          const local = VX_PRODUCTS.find((p) => p.productId === it.productId)
          // 이미 산 것을 다시 팔지 않는다. 눌러도 아무 변화가 없는 버튼이 제일 나쁘다.
          const already = it.productId === NO_ADS_PRODUCT_ID && wallet.noAds
          const blocked = !it.purchasable || it.purchaseLimitReached || already

          return (
            <div key={it.productId} className="shop-item">
              <img src={it.imageUrl || `/assets/${local?.image ?? 'icon_vx'}.webp`} alt="" />
              <div className="shop-info">
                <strong>{it.name || local?.fallbackName || it.productId}</strong>
                <span>{local?.grants ?? it.description}</span>
              </div>
              {blocked ? (
                <span className="shop-tag">
                  {already ? '보유 중' : (it.purchaseBlockReason ?? '구매 불가')}
                </span>
              ) : (
                <button className="ghost small" onClick={() => onBuy(it.productId)}>
                  <img src="/assets/icon_vx.webp" alt="" className="vx-icon" />
                  {it.price}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="board-note small">
        실제 결제 · 계정에 영구 적용
        <br />
        스킨은 코인으로만 산다 · 순위에 영향 없음
      </p>
    </>
  )
}
