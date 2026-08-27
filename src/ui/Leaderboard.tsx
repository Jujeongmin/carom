import { useCallback, useEffect, useState } from 'react'
import { useGameServer } from '@agent8/gameserver'
import {
  fetchMyRank,
  fetchTop,
  type RankEntry,
  type Ranked,
  type RemoteServer,
} from '../net/leaderboard'
import { t, useLang } from '../i18n'

interface Props {
  /** 지금 도달한 스테이지. 이름을 바꿀 때 기록을 이 값으로 다시 올린다. */
  currentStage: number
  nickname: string
  onRename: (name: string, currentStage: number) => Promise<void>
  onClose: () => void
}

/**
 * 랭킹 — 최고 도달 스테이지.
 *
 * 등록은 스테이지를 깰 때 자동으로 끝나 있다(useRanking). 이 창은 보는 곳이고,
 * 바꿀 수 있는 것은 표시 이름뿐이다.
 *
 * 서버가 없거나 연결 전이면 그 사실을 그대로 보여준다.
 * 빈 목록을 순위처럼 보여주면 "아무도 없다"와 "못 불러왔다"가 구분되지 않는다.
 */
export default function Leaderboard({ currentStage, nickname, onRename, onClose }: Props) {
  useLang()
  const { connected, server, account } = useGameServer()
  const [top, setTop] = useState<RankEntry[]>([])
  const [mine, setMine] = useState<Ranked<RankEntry>>({ entry: null, rank: -1 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nickname)
  const [saving, setSaving] = useState(false)

  const remote = server as unknown as RemoteServer | undefined

  const refresh = useCallback(async () => {
    if (!remote) return
    setLoading(true)
    // 변수 이름을 t로 두면 번역 함수 t를 가린다. 지금은 여기서 안 쓰지만 언젠가 쓴다.
    const [rows, m] = await Promise.all([fetchTop(remote), fetchMyRank(remote)])
    setTop(rows)
    setMine(m)
    setLoading(false)
  }, [remote])

  useEffect(() => {
    if (!connected) return
    void refresh()
  }, [connected, refresh])

  const save = async () => {
    const name = draft.trim()
    if (!name || name === nickname) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onRename(name, currentStage)
    setSaving(false)
    setEditing(false)
    await refresh()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="board" onClick={(e) => e.stopPropagation()}>
        <h2 className="board-title">RANKING</h2>
        <p className="board-note small">{t('rank.subtitle')}</p>

        {!connected && <p className="board-note">{t('rank.connecting')}</p>}

        {connected &&
          (editing ? (
            <div className="board-submit">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('rank.namePlaceholder')}
                maxLength={15}
                disabled={saving}
                autoFocus
              />
              <button className="primary" onClick={save} disabled={saving || !draft.trim()}>
                {saving ? t('rank.saving') : t('rank.save')}
              </button>
            </div>
          ) : (
            <button
              className="ghost small board-rename"
              onClick={() => {
                setDraft(nickname)
                setEditing(true)
              }}
            >
              {nickname || t('rank.setName')} · {t('rank.change')}
            </button>
          ))}

        {connected && loading && <p className="board-note">{t('shop.loading')}</p>}

        {connected && !loading && top.length === 0 && (
          <p className="board-note">{t('rank.emptyList')}</p>
        )}

        {connected && !loading && top.length > 0 && (
          <ol className="board-list">
            {top.map((e, i) => (
              <li
                key={e.__id ?? `${e.account}-${i}`}
                className={account && e.account === account ? 'me' : undefined}
              >
                <span className="rank">{i + 1}</span>
                <span className="nick">{e.nickname}</span>
                <span className="val">{t('rank.stage', { n: e.stage })}</span>
              </li>
            ))}
          </ol>
        )}

        {/* 20위 밖이면 내 자리가 목록에 없으므로 따로 보여준다 */}
        {connected && mine.entry && mine.rank > 20 && (
          <div className="board-mine">
            <span className="rank">{mine.rank}</span>
            <span className="nick">{mine.entry.nickname}</span>
            <span className="val">{t('rank.stage', { n: mine.entry.stage })}</span>
          </div>
        )}

        <button className="primary board-close" onClick={onClose}>
          {t('shop.close')}
        </button>
      </div>
    </div>
  )
}
