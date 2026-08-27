import { useCallback, useEffect, useState } from 'react'
import { useGameServer } from '@agent8/gameserver'
import {
  fetchMyRank,
  fetchTop,
  type RankEntry,
  type Ranked,
  type RemoteServer,
} from '../net/leaderboard'

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
    const [t, m] = await Promise.all([fetchTop(remote), fetchMyRank(remote)])
    setTop(t)
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
        <p className="board-note small">최고 도달 스테이지 · 클리어할 때마다 자동 등록</p>

        {!connected && <p className="board-note">서버에 연결 중…</p>}

        {connected &&
          (editing ? (
            <div className="board-submit">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="닉네임 (1~15자)"
                maxLength={15}
                disabled={saving}
                autoFocus
              />
              <button className="primary" onClick={save} disabled={saving || !draft.trim()}>
                {saving ? '저장 중…' : '저장'}
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
              {nickname || '이름 설정'} · 변경
            </button>
          ))}

        {connected && loading && <p className="board-note">불러오는 중…</p>}

        {connected && !loading && top.length === 0 && (
          <p className="board-note">아직 등록된 기록이 없음</p>
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
                <span className="val">STAGE {e.stage}</span>
              </li>
            ))}
          </ol>
        )}

        {/* 20위 밖이면 내 자리가 목록에 없으므로 따로 보여준다 */}
        {connected && mine.entry && mine.rank > 20 && (
          <div className="board-mine">
            <span className="rank">{mine.rank}</span>
            <span className="nick">{mine.entry.nickname}</span>
            <span className="val">STAGE {mine.entry.stage}</span>
          </div>
        )}

        <button className="primary board-close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
