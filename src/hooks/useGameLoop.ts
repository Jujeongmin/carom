import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAllAssets, type SpriteName } from '../game/assets'
import { PHYSICS } from '../game/config'
import {
  createStage,
  lastBounced,
  lastContactCount,
  revive as reviveStage,
  step,
  trackOf,
} from '../game/engine'
import { predict } from '../game/foresight'
import { FX_SEC, computeViewport, draw, screenToWorld, type ActiveFx } from '../game/renderer'
import { shotFrom } from '../game/shot'
import { playSfx, resetSfxFrame, unlockAudio } from '../audio'
import type {
  BodyRole,
  GameState,
  Input,
  ModifierId,
  Objective,
  Prediction,
  RunOptions,
} from '../game/types'

export interface Hud {
  stage: number
  objective: Objective
  modifier: ModifierId
  phase: GameState['phase']
  shotsUsed: number
  targetsLeft: number
  totalTargets: number
  timeLeft: number
  /** 이 스테이지에서 흐른 시간(초). 리더보드 누적에 쓴다. */
  elapsed: number
  coins: number
  bestChain: number
  aiming: boolean
  /** 지금 조준선이 무엇을 가리키는가 */
  aimRole: BodyRole | null
  track: 'classic' | 'unlimited'
  canRevive: boolean
}

const HUD_INTERVAL_MS = 60

/**
 * @param pausedExternally 튜토리얼처럼 화면이 덮였을 때 제한 시간까지 멈춘다.
 *   읽는 동안 시간이 깎이면 설명이 벌칙이 된다.
 */
export function useGameLoop(
  opts: RunOptions,
  startStage = 1,
  skin: SpriteName = 'char_base',
  pausedExternally = false,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState | null>(null)
  const inputsRef = useRef<Input[]>([])
  const predictionRef = useRef<Prediction | null>(null)
  const stageRef = useRef(1)
  const optsRef = useRef(opts)
  optsRef.current = opts
  // 스킨은 판 도중에도 바뀔 수 있으므로 ref로 읽는다. 루프를 다시 만들 이유가 없다.
  const skinRef = useRef(skin)
  skinRef.current = skin
  // ref로 읽는다. 값이 바뀔 때마다 루프를 다시 만들면 진행 중인 판이 초기화된다.
  const pausedRef = useRef(pausedExternally)
  pausedRef.current = pausedExternally

  const [hud, setHud] = useState<Hud>({
    stage: 1,
    objective: 'destroyAll',
    modifier: 'none',
    phase: 'playing',
    shotsUsed: 0,
    targetsLeft: 0,
    totalTargets: 0,
    timeLeft: 0,
    elapsed: 0,
    coins: 0,
    bestChain: 0,
    aiming: false,
    aimRole: null,
    track: 'classic',
    canRevive: true,
  })

  const readHud = useCallback((s: GameState, pred: Prediction | null): Hud => ({
    stage: s.spec.index,
    objective: s.spec.objective,
    modifier: s.spec.modifier,
    phase: s.phase,
    shotsUsed: s.shotsUsed,
    targetsLeft: s.targetsLeft,
    totalTargets: s.spec.targets,
    timeLeft: Math.max(0, s.timeLeft),
    elapsed: s.time,
    coins: s.coins,
    bestChain: s.bestChain,
    aiming: s.aiming,
    aimRole: pred?.hitRole ?? null,
    track: trackOf(s),
    canRevive: !s.usedRevive,
  }), [])

  const loadStage = useCallback(
    (index: number) => {
      stageRef.current = index
      const seed = (index * 2654435761) ^ 0x5f3a
      const s = createStage(index, seed, optsRef.current)
      stateRef.current = s
      inputsRef.current.length = 0
      predictionRef.current = null
      setHud(readHud(s, null))
    },
    [readHud],
  )

  const retry = useCallback(() => loadStage(stageRef.current), [loadStage])
  const nextStage = useCallback(() => loadStage(stageRef.current + 1), [loadStage])

  const revive = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    reviveStage(s)
    setHud(readHud(s, predictionRef.current))
  }, [readHud])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!stateRef.current) {
      const index = Math.max(1, Math.floor(startStage))
      stageRef.current = index
      stateRef.current = createStage(index, (index * 2654435761) ^ 0x5f3a, optsRef.current)
    }

    // 첫 프레임이 돌기 전에 HUD를 한 번 채운다.
    // 튜토리얼처럼 멈춘 채로 시작하면 루프가 갱신해주지 않아
    // "0.0s · 타깃 0/0"이 그대로 보인다 — 시작도 안 했는데 시간이 다 된 것처럼 읽힌다.
    setHud(readHud(stateRef.current, null))

    void loadAllAssets()

    let vp = computeViewport(canvas.clientWidth, canvas.clientHeight)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      vp = computeViewport(canvas.clientWidth, canvas.clientHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    const toWorld = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return screenToWorld(vp, e.clientX - rect.left, e.clientY - rect.top)
    }
    const active = { id: -1 }

    const onDown = (e: PointerEvent) => {
      // 브라우저는 제스처 안에서만 오디오를 켜준다. 캔버스를 누르는 이 순간이 그 자리다.
      unlockAudio()
      const s = stateRef.current
      if (!s || s.phase !== 'playing') return
      active.id = e.pointerId
      canvas.setPointerCapture(e.pointerId)
      const p = toWorld(e)
      inputsRef.current.push({ type: 'aim', x: p.x, y: p.y })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== active.id) return
      const p = toWorld(e)
      inputsRef.current.push({ type: 'move', x: p.x, y: p.y })
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== active.id) return
      active.id = -1
      const p = toWorld(e)
      inputsRef.current.push({ type: 'release', x: p.x, y: p.y })
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let lastHudAt = 0
    let effects: ActiveFx[] = []
    let paused = false
    const hudPhase = { current: stateRef.current.phase }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const s = stateRef.current
      if (!s) return

      acc += Math.min(now - last, 250) / 1000
      last = now
      if (paused || pausedRef.current) {
        // 멈춘 동안 쌓인 시간을 버린다. 남겨두면 재개하는 순간 몰아서 흘러간다.
        acc = 0
        draw(ctx, s, vp, null, effects, skinRef.current)
        return
      }

      let steps = 0
      resetSfxFrame()
      const phaseBefore = s.phase
      // 한 프레임에 스텝이 여러 번 돌 수 있다. 스크래치는 스텝마다 덮이므로
      // 루프가 끝난 뒤에 읽으면 중간에 일어난 접촉을 놓친다.
      let touched = false
      let bounced = false
      while (acc >= PHYSICS.dt && steps < PHYSICS.maxStepsPerFrame) {
        const q = inputsRef.current
        step(s, PHYSICS.dt, q)
        if (lastContactCount() > 0) touched = true
        if (lastBounced()) bounced = true
        if (q.length) q.length = 0
        for (const e of s.fx) {
          effects.push({ ...e, at: s.time })
          // 소리는 렌더러와 같은 이벤트 흐름에서 낸다. 판단을 두 곳에 두면
          // 화면과 소리가 어긋나기 시작한다.
          if (e.kind === 'dash') playSfx('shot')
          else if (e.kind === 'warp') playSfx('warp')
          else if (e.kind === 'destroy') playSfx('destroy')
          else if (e.kind === 'chain') playSfx('chain', { depth: e.depth })
          else if (e.kind === 'explode') playSfx('explode')
        }
        acc -= PHYSICS.dt
        steps++
      }

      // 접촉음. 당구 게임이라 이게 없으면 손맛이 통째로 사라진다.
      // 프레임당 한 번씩만 낸다 — 스텝마다 내면 스치는 접촉에서 소리가 갈린다.
      if (touched) playSfx('hitBody')
      if (bounced) playSfx('hitWall')
      if (phaseBefore === 'playing' && s.phase !== 'playing') {
        playSfx(s.phase === 'cleared' ? 'clear' : 'fail')
      }
      if (steps === PHYSICS.maxStepsPerFrame) acc = 0

      // 조준 중이고, 데드존을 벗어나 실제로 발사될 때만 그린다.
      // 선이 없다는 것 자체가 "지금 떼면 아무 일도 안 일어난다"는 신호가 된다.
      const shot = shotFrom(s.anchorX, s.anchorY, s.aimX, s.aimY)
      predictionRef.current =
        s.phase === 'playing' && s.aiming && shot
          ? predict(
              s.bodies,
              s.player,
              s.portals,
              shot,
              s.time,
              { objective: s.spec.objective, orderNext: s.orderNext },
              s.spec.aimSegments,
            )
          : null

      effects = effects.filter((f) => s.time - f.at < FX_SEC)
      draw(ctx, s, vp, predictionRef.current, effects, skinRef.current)

      if (now - lastHudAt > HUD_INTERVAL_MS || s.phase !== hudPhase.current) {
        lastHudAt = now
        hudPhase.current = s.phase
        setHud(readHud(s, predictionRef.current))
      }
    }

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__dl = {
        get state() {
          return stateRef.current
        },
        get prediction() {
          return predictionRef.current
        },
        pause() {
          paused = true
        },
        resume() {
          paused = false
        },
        aim(x: number, y: number) {
          inputsRef.current.push({ type: 'aim', x, y })
        },
        release(x: number, y: number) {
          inputsRef.current.push({ type: 'release', x, y })
        },
        step(n = 1) {
          const s = stateRef.current
          if (!s) return
          for (let i = 0; i < n; i++) {
            const q = inputsRef.current
            step(s, PHYSICS.dt, q)
            if (q.length) q.length = 0
            for (const e of s.fx) effects.push({ ...e, at: s.time })
          }
          predictionRef.current = s.aiming
            ? predict(
              s.bodies,
              s.player,
              s.portals,
              shotFrom(s.anchorX, s.anchorY, s.aimX, s.aimY),
              s.time,
              { objective: s.spec.objective, orderNext: s.orderNext },
              s.spec.aimSegments,
            )
            : null
          effects = effects.filter((f) => s.time - f.at < FX_SEC)
          draw(ctx, s, vp, predictionRef.current, effects, skinRef.current)
        },
      }
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [readHud, startStage])

  return { canvasRef, hud, retry, nextStage, revive }
}
