/**
 * 에셋 용량 최적화.
 *   node scripts/optimize-assets.mjs
 *
 * PNG를 WebP로 변환한다. 원본은 지우지 않고 그대로 둔다 —
 * 변환이 잘못돼도 되돌릴 수 있어야 하고, 원본이 있어야 다시 뽑을 필요가 없다.
 *
 * 배경과 로고가 전체 용량의 절반을 차지한다. 어두운 노이즈와 네온 발광은
 * PNG의 무손실 압축과 상성이 나빠서 WebP 손실 압축에서 크게 줄어든다.
 *
 * 알파가 있는 스프라이트도 WebP가 알파를 지원하므로 그대로 변환된다.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const DIR = 'public/assets'

/** 파일별 품질. 배경은 낮춰도 티가 안 나고, 작은 아이콘은 높게 유지한다. */
const QUALITY = {
  bg_space_tile: 72,
  logo_title: 86,
  app_icon_512: 86,
  app_icon_192: 90,
  apple_touch_icon: 90,
}
const DEFAULT_QUALITY = 88

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith('.png'))

let before = 0
let after = 0
const rows = []

for (const file of files) {
  const name = path.basename(file, '.png')
  const src = path.join(DIR, file)
  const out = path.join(DIR, `${name}.webp`)

  const srcSize = (await fs.stat(src)).size
  await sharp(src)
    .webp({ quality: QUALITY[name] ?? DEFAULT_QUALITY, effort: 6 })
    .toFile(out)
  const outSize = (await fs.stat(out)).size

  before += srcSize
  after += outSize
  rows.push({ name, srcSize, outSize })
}

rows.sort((a, b) => b.srcSize - a.srcSize)
console.log('파일'.padEnd(22), 'PNG'.padStart(8), 'WebP'.padStart(8), '  절감')
for (const r of rows) {
  const cut = Math.round((1 - r.outSize / r.srcSize) * 100)
  console.log(
    r.name.padEnd(22),
    `${Math.round(r.srcSize / 1024)}KB`.padStart(8),
    `${Math.round(r.outSize / 1024)}KB`.padStart(8),
    `  ${cut}%`,
  )
}
console.log(
  `\n합계 ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB ` +
    `(${Math.round((1 - after / before) * 100)}% 절감)`,
)
