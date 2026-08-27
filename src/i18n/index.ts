import { useSyncExternalStore } from 'react'
import { LANGS, STRINGS, type Lang, type StringKey } from './strings'

export { LANGS, LANG_LABEL, type Lang } from './strings'
export type { StringKey } from './strings'

/**
 * 언어 상태.
 *
 * React 컨텍스트를 쓰지 않는 이유: 광고 래퍼(net/ads.ts)처럼 컴포넌트가 아닌 곳에서도
 * 사용자에게 보일 문장을 만든다. 컨텍스트로 두면 그런 파일은 번역을 못 쓰거나
 * 문자열을 다시 UI까지 들고 올라가야 한다.
 *
 * 모듈 상태 + 구독으로 두면 t()는 어디서나 부를 수 있고,
 * 화면은 useLang()으로 다시 그린다.
 */

const KEY = 'carom.lang.v1'

/** 브라우저 설정에서 고른다. 중국어는 표기 체계가 갈리므로 지역까지 본다. */
function detect(): Lang {
  try {
    for (const raw of navigator.languages ?? [navigator.language]) {
      const tag = raw.toLowerCase()
      if (tag.startsWith('ko')) return 'ko'
      if (tag.startsWith('zh')) {
        // zh-TW · zh-HK · zh-MO · zh-Hant 는 번체
        return /hant|tw|hk|mo/.test(tag) ? 'zh-Hant' : 'zh-Hans'
      }
      if (tag.startsWith('en')) return 'en'
    }
  } catch {
    // navigator가 없거나 막힌 환경. 아래 기본값으로 간다.
  }
  return 'en'
}

function load(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang
  } catch {
    // 저장소가 막혀 있으면 감지값을 쓴다
  }
  return detect()
}

let current: Lang = load()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // 저장 실패로 언어 변경을 막지 않는다. 이번 세션에는 적용된다.
  }
  // 화면 언어가 바뀌면 문서 언어도 바꾼다. 폰트·줄바꿈 규칙이 여기에 걸린다.
  try {
    document.documentElement.lang = lang
  } catch {
    // 무시
  }
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 언어가 바뀌면 다시 그린다. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}

/**
 * 문자열 하나.
 *
 * 번역이 비어 있으면 한국어로 떨어진다 — 빈 화면보다 읽히는 편이 낫다.
 * {n} 같은 자리표시자는 params로 채운다.
 */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const entry = STRINGS[key] as Record<Lang, string>
  let out = entry[current] || entry.ko
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v))
  }
  return out
}

// 첫 로드 시에도 문서 언어를 맞춰둔다.
try {
  document.documentElement.lang = current
} catch {
  // 무시
}
