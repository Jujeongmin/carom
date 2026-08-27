import { stageSpec } from '../src/game/stage'

const full: string[] = []
for (let i = 1; i <= 400; i++) {
  const s = stageSpec(i)
  full.push(
    `${s.objective}|${s.theme}|${s.modifier}|${s.targets}|${s.bombs}|${s.portals}|${s.hazards}|${s.neutrals}|${s.timeLimit}|${Math.round(s.speed)}|${s.aimSegments}`,
  )
}
const seen = new Set<string>()
let firstRepeat = -1
for (let i = 0; i < full.length; i++) {
  if (seen.has(full[i]) && firstRepeat < 0) firstRepeat = i + 1
  seen.add(full[i])
}
// 축별 주기가 실제로 곱해지는지 확인
let cycle = -1
for (let c = 1; c <= 400 && cycle < 0; c++) {
  let ok = true
  for (let i = 40; i < 300 && ok; i++) if (full[i] !== full[i + c]) ok = false
  if (ok) cycle = c
}
console.log(`설계가 처음 겹치는 스테이지 : ${firstRepeat}`)
console.log(`서로 다른 설계 총 개수      : ${seen.size}가지`)
console.log(`설계 순환 주기              : ${cycle}스테이지`)
