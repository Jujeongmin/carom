/**
 * 무입력 검사.
 * 공이 멈추지 않는 게임이라 가만히 둬도 알아서 타깃을 부술 수 있다.
 * 이 비율이 높으면 "기다리는 게 최적"이 되어 게임이 죽는다.
 */
import { PHYSICS } from '../src/game/config'
import { createStage, step } from '../src/game/engine'
import { stageSpec } from '../src/game/stage'

console.log('St 테마       타깃  무입력파괴  결과   소요')
let idleClears = 0
for (let i = 1; i <= 20; i++) {
  const spec = stageSpec(i)
  const s = createStage(i, (i * 2654435761) ^ 0x5f3a, { extraSeconds: 0 })
  while (s.phase === 'playing' && s.time < spec.timeLimit + 1) step(s, PHYSICS.dt, [])
  if (s.phase === 'cleared') idleClears++
  console.log(
    `${String(i).padStart(2)} ${spec.theme.padEnd(9)} ${String(spec.targets).padStart(4)}  ${String(s.destroyed).padStart(9)}  ${(s.phase === 'cleared' ? 'CLEAR' : s.phase === 'failed' ? 'fail ' : '-----').padStart(5)}  ${s.time.toFixed(1)}s`,
  )
}
console.log(`\n무입력 클리어: ${idleClears}/20`)
