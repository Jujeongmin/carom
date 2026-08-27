import { stageSpec, buildStage, startingPlayer } from '../src/game/stage'

const key = (i: number) => {
  const s = stageSpec(i)
  const built = buildStage(s, startingPlayer(), (i * 2654435761) ^ 0x5f3a)
  const walls = built.bodies.filter((b) => b.role === 'wall').length
  return {
    // 변주도 구성의 일부다. 빼고 세면 서로 다른 판을 같은 판으로 센다.
    text: `${s.objective}|${s.theme}|${s.modifier}|${s.targets}|${s.bombs}|${s.portals}|${s.hazards}|${s.neutrals}|${walls}|${s.timeLimit}|${Math.round(s.speed)}`,
    s,
    walls,
  }
}

console.log('St 조건        테마      변주       타깃 폭탄 포탈 위험 중립 기둥 제한 속도')
const seen = new Map<string, number>()
let firstRepeat = -1
let lastChangeAt = 1
let prev = ''
for (let i = 1; i <= 120; i++) {
  const k = key(i)
  if (firstRepeat < 0 && seen.has(k.text)) firstRepeat = i
  if (!seen.has(k.text)) seen.set(k.text, i)
  if (k.text !== prev) lastChangeAt = i
  prev = k.text
  if (i <= 46) {
    const s = k.s
    console.log(
      `${String(i).padStart(2)} ${s.objective.padEnd(10)} ${s.theme.padEnd(9)} ${s.modifier.padEnd(10)} ${String(s.targets).padStart(3)} ${String(s.bombs).padStart(4)} ${String(s.portals).padStart(4)} ${String(s.hazards).padStart(4)} ${String(s.neutrals).padStart(4)} ${String(k.walls).padStart(4)} ${String(s.timeLimit).padStart(4)} ${String(Math.round(s.speed)).padStart(4)}`,
    )
  }
}
console.log(`\n서로 다른 조합: ${seen.size}가지 (1~120 스테이지 기준)`)
console.log(`처음으로 이전과 똑같은 조합이 나오는 스테이지: ${firstRepeat < 0 ? '없음' : firstRepeat}`)
console.log(`구성이 마지막으로 바뀌는 스테이지: ${lastChangeAt}`)
