import { Verse8Ads } from '@verse8/ads'

/**
 * Verse8 Ads 래퍼.
 *
 * SDK 호출을 이 파일 하나에 가둔다. UI는 광고 SDK를 직접 모른다.
 *
 * 규칙 두 개는 문서가 명시한 것이고 코드 구조로 지킨다:
 *   1) 반드시 사용자 제스처(버튼 클릭)에서만 호출한다. 자동 호출은 정책 위반이다.
 *      → 이 파일의 함수는 onClick 밖에서 부르지 않는다.
 *   2) showRewarded는 절대 throw하지 않고 항상 resolve한다.
 *      status가 'rewarded'가 아니면 보상을 주지 않는다.
 */

export const PLACEMENT = {
  /** 실패 후 이어하기 */
  revive: 'carom-revive',
  /** 클리어 코인 2배 */
  doubleCoins: 'carom-double-coins',
} as const

export type PlacementId = (typeof PLACEMENT)[keyof typeof PLACEMENT]

export type AdOutcome =
  | { ok: true; requestId: string }
  | { ok: false; reason: 'dismissed' }
  | { ok: false; reason: 'busy' | 'timeout' | 'unsupported' | 'error'; message: string }

/**
 * 이 환경에서 광고 자체가 불가능한 경우.
 * 문서 권장대로 세션 동안 광고 버튼을 아예 숨기기 위해 기억해둔다 —
 * 눌러도 매번 실패하는 버튼을 계속 보여주는 것이 가장 나쁜 UX다.
 */
let unsupported = false
export function adsUnsupported(): boolean {
  return unsupported
}

/** 이미 광고가 떠 있는 동안 또 누르는 것을 막는다(문서의 busy 상태). */
let showing = false
export function adBusy(): boolean {
  return showing
}

export async function showRewarded(placementId: PlacementId): Promise<AdOutcome> {
  if (showing) return { ok: false, reason: 'busy', message: '광고를 불러오는 중입니다' }
  showing = true
  try {
    const result = await Verse8Ads.showRewarded({ placementId })

    if (result.status === 'rewarded') {
      return { ok: true, requestId: result.requestId }
    }
    if (result.status === 'dismissed') {
      return { ok: false, reason: 'dismissed' }
    }

    const code = result.error?.code
    if (code === 'unsupported_env') {
      unsupported = true
      return { ok: false, reason: 'unsupported', message: '이 환경에서는 광고를 볼 수 없습니다' }
    }
    if (code === 'busy') {
      return { ok: false, reason: 'busy', message: '광고를 불러오는 중입니다' }
    }
    if (code === 'timeout') {
      return { ok: false, reason: 'timeout', message: '광고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요' }
    }
    return { ok: false, reason: 'error', message: '광고를 볼 수 없습니다' }
  } finally {
    showing = false
  }
}
