import { LANGS, LANG_LABEL, setLang, useLang } from '../i18n'

/**
 * 언어 선택.
 *
 * 네 개뿐이라 드롭다운을 쓰지 않는다 — 한 번 눌러 바꿀 수 있는 것을
 * 두 번 누르게 만들 이유가 없다.
 *
 * 각 언어 이름을 그 언어로 적는다. 읽을 수 없는 언어로 적힌 선택지는
 * 정작 그 언어가 필요한 사람이 못 찾는다.
 */
export default function LangSwitch() {
  const lang = useLang()

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l}
          className={l === lang ? 'lang on' : 'lang'}
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  )
}
