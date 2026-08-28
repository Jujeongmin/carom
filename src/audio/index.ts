import { useSyncExternalStore } from 'react'
import { ensureAudio, getVolumes, setVolume, subscribeVolumes, type Volumes } from './engine'
import { musicRunning, startMusic, stopMusic } from './music'
import { playSfx, type SfxName } from './sfx'

export { playSfx, resetSfxFrame } from './sfx'
export type { SfxName } from './sfx'
export type { Volumes } from './engine'
export { getVolumes } from './engine'

/**
 * 오디오 공개 API.
 *
 * 브라우저는 사용자 제스처 없이 소리를 못 낸다. 그래서 "언제 켜는가"를
 * 한 곳에서 정한다: 첫 클릭·첫 터치에서 켠다(unlockAudio).
 */

/**
 * 첫 제스처에서 부른다. 오디오를 켜고, 배경음 볼륨이 0이 아니면 음악을 시작한다.
 * 여러 번 불러도 안전하다.
 */
export function unlockAudio(): void {
  const c = ensureAudio()
  if (!c) return
  if (getVolumes().music > 0 && !musicRunning()) startMusic()
}

/**
 * 볼륨 변경. 배경음을 0으로 내리면 스케줄러까지 멈춘다 —
 * 게인만 0으로 두면 안 들리는 음을 계속 만들며 배터리를 쓴다.
 */
export function changeVolume(kind: keyof Volumes, value: number): void {
  setVolume(kind, value)
  if (kind !== 'music') return
  if (value > 0) {
    ensureAudio()
    if (!musicRunning()) startMusic()
  } else if (musicRunning()) {
    stopMusic()
  }
}

/** 슬라이더가 값을 따라 움직이게 한다. */
export function useVolumes(): Volumes {
  return useSyncExternalStore(subscribeVolumes, getVolumes, getVolumes)
}

/** UI 버튼용. 누를 때 소리도 내고 오디오도 켠다. */
export function uiClick(): void {
  unlockAudio()
  playSfx('ui')
}

/**
 * 모든 버튼에 클릭음을 붙인다. **한 번만 부른다.**
 *
 * 버튼마다 onClick에 손으로 넣으면 새 버튼을 만들 때마다 빠뜨린다 —
 * 실제로 타이틀 버튼에만 붙어 있어서 상점·랭킹·설정·게임 화면은 전부 무음이었다.
 * 문서 레벨에서 한 번 잡는 편이 빠뜨릴 자리가 없다.
 *
 * click이 아니라 pointerdown에서 낸다. 누른 순간에 나야 반응이 붙어 있다고 느낀다.
 * 캡처 단계에서 듣는 이유는 stopPropagation을 쓰는 오버레이가 있기 때문이다.
 */
export function installUiSounds(): void {
  if (installed) return
  installed = true
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = e.target as HTMLElement | null
      const btn = el?.closest?.('button')
      // 비활성 버튼은 아무 일도 안 일어나므로 소리도 내지 않는다.
      if (!btn || (btn as HTMLButtonElement).disabled) return
      uiClick()
    },
    { capture: true },
  )
}

let installed = false

/** 이름을 다시 내보내 호출부가 './audio' 하나만 알면 되게 한다. */
export type { SfxName as Sfx }
export { playSfx as sfx }
export function play(name: SfxName, depth?: number): void {
  playSfx(name, { depth })
}
