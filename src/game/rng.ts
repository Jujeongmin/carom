/**
 * 결정적 난수. 같은 시드 → 같은 런.
 * 헤드리스 시뮬레이션으로 밸런스를 측정하려면 스폰이 재현 가능해야 한다.
 * Math.random()을 쓰면 그 측정이 불가능해지므로 게임 코드에서는 절대 쓰지 않는다.
 */
export function nextSeed(seed: number): number {
  return (seed + 0x6d2b79f5) | 0
}

/** 시드를 소비해 [0,1) 난수와 다음 시드를 돌려준다. */
export function rand(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0
  let x = t
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296
  return { value, seed: t }
}

export function randRange(seed: number, min: number, max: number) {
  const r = rand(seed)
  return { value: min + r.value * (max - min), seed: r.seed }
}
