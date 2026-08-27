/**
 * 튜토리얼을 봤는지 여부.
 *
 * 서버에 두지 않는다. 재화가 아니라 화면 설정이고, 저장이 날아가서 한 번 더 보는 것이
 * 최악의 결과다. 기기마다 처음이면 처음부터 보여주는 편이 오히려 맞다.
 */

const KEY = 'carom.tutorial.v1'

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    // 저장소가 막혀 있으면 매번 보여준다. 안 보여주는 것보다 낫다.
    return false
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // 무시. 저장 실패로 게임을 막지 않는다.
  }
}
