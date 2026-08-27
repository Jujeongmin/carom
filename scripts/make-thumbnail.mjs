/**
 * 스토어 썸네일(1:1) 생성.
 *
 *   node scripts/make-thumbnail.mjs
 *
 * 1024와 512 두 벌을 만든다. 결과는 docs/store-assets/.
 *
 * 게임에 실제로 쓰는 스프라이트와 실제 색 규칙만 쓴다:
 *   타깃 = ob_asteroid (금색 글로우) · 위험물 = ob_metal (적색) · 폭발통 = ob_bomb (주황)
 *   중립 = ob_shard · 큐볼 = char_base (시안)
 *   조준선 = 금색 — 이 게임에서 금색은 "이 샷은 부순다"는 뜻이다.
 *
 * 로고 없이 게임 장면만 담는다.
 *
 * 없는 것을 그리지 않는다. 썸네일이 게임보다 좋아 보이면 그건 광고가 아니라 거짓말이다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'public', 'assets')
const outDir = path.join(root, 'docs', 'store-assets')

const S = 1024

/** 게임 팔레트 그대로 */
const C = {
  bg: '#0a0a1a',
  player: '#4de1ff',
  target: '#ffc94d',
  hazard: '#ff4d5e',
  bomb: '#ff8c3c',
}

/**
 * 큐볼 → 오른쪽 벽 → 타깃. 벽을 맞히고 넣는 bankShot 한 장면이다.
 * HIT의 y는 입사각과 같은 반사각이 나오도록 계산해서 넣는다 —
 * 눈대중으로 찍으면 물리가 틀린 그림이 되고, 이 게임은 조준선이 정확한 것이 전부다.
 */
const CUE = { x: 248, y: 852 }
const BOUNCE = { x: 982, y: 536 }
const HIT = { x: 655, y: Math.round(BOUNCE.y - ((BOUNCE.x - 655) * (CUE.y - BOUNCE.y)) / (BOUNCE.x - CUE.x)) }

/** 스프라이트 배치. size는 그려질 지름. */
const pieces = [
  { file: 'ob_asteroid_a.webp', size: 210, cx: HIT.x, cy: HIT.y, glow: C.target, glowR: 146 },
  { file: 'ob_asteroid_b.webp', size: 186, cx: 868, cy: 690, glow: C.target, glowR: 130 },
  { file: 'ob_asteroid_a.webp', size: 178, cx: 252, cy: 328, glow: C.target, glowR: 124 },
  { file: 'ob_metal_a.webp', size: 176, cx: 452, cy: 622, glow: C.hazard, glowR: 126 },
  { file: 'ob_bomb_a.webp', size: 172, cx: 630, cy: 856, glow: C.bomb, glowR: 122 },
  { file: 'ob_shard_b.webp', size: 128, cx: 872, cy: 226, glow: null, glowR: 0 },
  { file: 'portal_ring.webp', size: 150, cx: 172, cy: 632, glow: C.player, glowR: 106 },
  { file: 'char_base.webp', size: 152, cx: CUE.x, cy: CUE.y, glow: C.player, glowR: 120 },
]

const glowDefs = pieces
  .filter((p) => p.glow)
  .map(
    (p, i) => `
    <radialGradient id="g${i}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="${p.glow}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
    </radialGradient>`,
  )
  .join('')

const glowCircles = pieces
  .filter((p) => p.glow)
  .map((p, i) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.glowR}" fill="url(#g${i})"/>`)
  .join('\n  ')

/** 배경 + 글로우. 스프라이트 아래에 깔린다. */
const backdrop = Buffer.from(`
<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vig" cx="50%" cy="46%" r="72%">
      <stop offset="0%" stop-color="#141a33" stop-opacity="1"/>
      <stop offset="100%" stop-color="${C.bg}" stop-opacity="1"/>
    </radialGradient>
    ${glowDefs}
  </defs>
  <rect width="${S}" height="${S}" fill="url(#vig)"/>
  ${glowCircles}
</svg>`)

/**
 * 조준선. 스프라이트 위에 얹어야 벽을 맞고 지나가는 것이 보인다.
 * 게임과 같이 점선 + 도착 지점 표시로 그린다.
 */
const aim = Buffer.from(`
<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
  <g stroke="${C.target}" fill="none" stroke-linecap="round">
    <polyline points="${CUE.x},${CUE.y} ${BOUNCE.x},${BOUNCE.y} ${HIT.x},${HIT.y}"
              stroke-width="16" stroke-opacity="0.16"/>
    <polyline points="${CUE.x},${CUE.y} ${BOUNCE.x},${BOUNCE.y} ${HIT.x},${HIT.y}"
              stroke-width="6" stroke-opacity="0.95" stroke-dasharray="22 16"/>
  </g>
  <circle cx="${BOUNCE.x}" cy="${BOUNCE.y}" r="11" fill="${C.target}" fill-opacity="0.9"/>
  <circle cx="${HIT.x}" cy="${HIT.y}" r="116" fill="none"
          stroke="${C.target}" stroke-opacity="0.85" stroke-width="5"/>
  <rect x="8" y="8" width="${S - 16}" height="${S - 16}" rx="44"
        fill="none" stroke="${C.player}" stroke-opacity="0.35" stroke-width="4"/>
</svg>`)

async function fit(file, size) {
  return sharp(path.join(assets, file))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function build() {
  const sprites = await Promise.all(
    pieces.map(async (p) => ({
      input: await fit(p.file, p.size),
      left: Math.round(p.cx - p.size / 2),
      top: Math.round(p.cy - p.size / 2),
    })),
  )

  // 로고는 넣지 않는다. 스토어가 이미 게임 이름을 옆에 붙여주므로
  // 썸네일 안에서 또 이름을 외치면 정작 보여줘야 할 장면이 좁아진다.
  const out1024 = path.join(outDir, 'thumbnail_1024.png')
  await sharp(backdrop)
    .composite([...sprites, { input: aim, left: 0, top: 0 }])
    .png()
    .toFile(out1024)

  const out512 = path.join(outDir, 'thumbnail_512.png')
  await sharp(out1024).resize(512, 512).png().toFile(out512)

  for (const f of [out1024, out512]) {
    console.log(`${path.basename(f)}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB`)
  }
  console.log(`\n→ ${path.relative(root, outDir)}`)
}

await build()
