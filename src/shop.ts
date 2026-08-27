import type { SpriteName } from './game/assets'
import type { StringKey } from './i18n'

/**
 * 코인 상점.
 *
 * 코인이 갈 곳이 없으면 코인이 무의미해지고, 코인이 무의미하면
 * "코인 2배" 광고를 볼 이유도 사라진다. 상점은 광고 수익 루프의 전제다.
 *
 * 사용처를 두 종류로 나눈다:
 *   - 영구(스킨): 목표가 되지만 다 사면 수요가 끝난다
 *   - 반복 소모(이어하기): 다 사고 나서도 코인이 계속 필요하게 만든다
 * 둘 중 하나만 있으면 코인 경제가 언젠가 멈춘다.
 *
 * ── 가격은 `npm run sim`의 "가격별 도달 스테이지"에서 나온 값이다 ──
 *
 *   80  → 9스테이지    300 → 20스테이지   (한 번도 실패하지 않은 봇 기준)
 *
 * 예전 값 150/400은 각각 13·24스테이지였다. 첫 구매가 13스테이지면
 * 그때까지 코인이 아무 쓸모가 없고, **"코인 2배" 광고를 볼 이유도 그동안 없다.**
 * 상점은 광고 수익 루프의 전제인데 그 전제가 13판 동안 놀고 있었다.
 *
 * 80이면 첫 판에 하나 산다. 300은 20스테이지대의 목표로 남는다.
 * 이어하기까지 쓰면 실제로는 각각 2~3스테이지 뒤로 밀린다.
 *
 * **server.js의 SKIN_PRICES와 반드시 같아야 한다.** 어긋나면 화면에 뜬 값과
 * 실제로 빠지는 값이 달라진다 — 차감은 서버 표가 한다.
 */

export interface Skin {
  id: string
  /** 고유명이라 번역하지 않는다. 에셋·로고와 같은 표기로 남는다. */
  name: string
  sprite: SpriteName
  price: number
  /** 설명 문구의 번역 키 */
  noteKey: StringKey
}

export const SKINS: Skin[] = [
  {
    id: 'base',
    name: 'STANDARD',
    sprite: 'char_base',
    price: 0,
    noteKey: 'skin.base.note',
  },
  {
    id: 'pulse',
    name: 'PULSE',
    sprite: 'char_skin_pulse',
    price: 80,
    noteKey: 'skin.pulse.note',
  },
  {
    id: 'ember',
    name: 'EMBER',
    sprite: 'char_skin_ember',
    price: 300,
    noteKey: 'skin.ember.note',
  },
]

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}

/**
 * 실패했을 때 코인으로 사는 이어하기.
 * 광고 부활과 같은 자리에 놓여 "광고를 볼 것인가, 코인을 쓸 것인가"가 된다.
 * 스테이지당 1회는 광고와 공유한다 — 둘 다 쓰면 무한 재도전이 된다.
 *
 * ── 가격은 `npm run sim`의 코인 수급 측정에서 나온 값이다 ──
 *
 * 봇 30스테이지 기준: 클리어당 평균 18.8 · 중앙값 20, 초반은 8 안팎.
 * 누적은 6스테이지에 44, 8스테이지에 60.
 *
 * 예전 값 60은 **8스테이지가 되어야 처음 살 수 있었다**. 그것도 한 번도 실패하지 않은
 * 봇 기준이고, 코인은 클리어할 때만 들어온다. 실패가 가장 잦은 초반 내내
 * 버튼이 아예 뜨지 않았다 — 못 사는 가격은 가격이 아니다.
 *
 * 30이면 6스테이지쯤 처음 살 수 있고, 중앙값 수입의 1.5판치다.
 * 남용은 가격이 아니라 스테이지당 1회 제한이 막는다.
 */
export const CONTINUE_BASE = 30

/**
 * 10스테이지마다 +10.
 * 수입은 후반에 20~30대로 오르는데 값이 30에 묶여 있으면 곧 무의미해진다.
 * 중앙값 대비 1.5~2판치라는 비율을 끝까지 유지하기 위한 것이다.
 */
export function continueCost(stage: number): number {
  return CONTINUE_BASE + Math.floor(Math.max(0, stage - 1) / 10) * 10
}

export const CONTINUE_SECONDS = 12

/**
 * VX 상품(실제 결제) — **하나뿐이다**.
 *
 * 이름·가격·이미지는 대시보드가 가진 것이 진짜다. 여기 있는 것은 화면에 무엇을 주는지
 * 설명하기 위한 표일 뿐이고, **실제 지급은 서버의 $onItemPurchased만 한다**.
 * 그래서 이 표를 고쳐도 아무것도 더 받지 못한다.
 *
 * productId는 server.js의 VX_PRODUCTS 키와 정확히 같아야 한다.
 *
 * 스킨도 코인도 VX로 팔지 않는다. 코인을 모을 이유가 남아 있어야
 * "코인 2배"가 값어치를 갖고, 그래야 이 상품 하나가 팔린다.
 */
export interface VxProduct {
  productId: string
  /** 대시보드가 이름을 못 주는 동안 쓸 이름 */
  fallbackName: string
  /** 무엇을 받는지 한 줄 (번역 키) */
  grantsKey: StringKey
  /**
   * 대시보드 imageUrl이 오기 전/실패했을 때 쓸 로컬 썸네일 (public/assets 파일명).
   * 캔버스 스프라이트가 아니라 DOM img이므로 SpriteName이 아니다.
   */
  image: string
}

export const NO_ADS_PRODUCT_ID = 'carom-no-ads'

export const VX_PRODUCTS: VxProduct[] = [
  {
    productId: NO_ADS_PRODUCT_ID,
    fallbackName: 'NO ADS',
    grantsKey: 'vx.noAds.grants',
    image: 'icon_ad',
  },
]
