import { changeVolume, playSfx, useVolumes } from '../audio'
import { t, useLang } from '../i18n'
import LangSwitch from './LangSwitch'

interface Props {
  onClose: () => void
}

/**
 * 설정 — 소리와 언어.
 *
 * 슬라이더를 움직일 때마다 효과음을 한 번 낸다. 소리 설정은 귀로 확인하는 것이지
 * 숫자를 읽는 것이 아니다 — 들어보지 않고 맞추라는 슬라이더는 쓸모가 없다.
 */
export default function Settings({ onClose }: Props) {
  useLang()
  const vol = useVolumes()

  return (
    <div className="overlay" onClick={onClose}>
      <div className="board" onClick={(e) => e.stopPropagation()}>
        <h2 className="board-title">{t('settings.title')}</h2>

        <div className="setting">
          <div className="setting-row">
            <span>{t('settings.music')}</span>
            <em>{Math.round(vol.music * 100)}</em>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(vol.music * 100)}
            onChange={(e) => changeVolume('music', Number(e.target.value) / 100)}
          />
        </div>

        <div className="setting">
          <div className="setting-row">
            <span>{t('settings.sfx')}</span>
            <em>{Math.round(vol.sfx * 100)}</em>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(vol.sfx * 100)}
            onChange={(e) => {
              changeVolume('sfx', Number(e.target.value) / 100)
              // 방금 정한 크기를 바로 들려준다.
              playSfx('hitBody')
            }}
          />
        </div>

        <div className="setting">
          <div className="setting-row">
            <span>{t('settings.lang')}</span>
          </div>
          <LangSwitch />
        </div>

        <button className="primary board-close" onClick={onClose}>
          {t('shop.close')}
        </button>
      </div>
    </div>
  )
}
