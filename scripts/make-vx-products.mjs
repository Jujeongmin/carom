/**
 * VXShop 상품 썸네일(512×512) 생성.
 *
 *   node scripts/make-vx-products.mjs
 *
 * 대시보드 권장 규격이 512×512다. 게임에 이미 있는 스프라이트를 그대로 쓴다 —
 * 상품 이미지와 실제로 받는 것이 다르면 그건 광고가 아니라 거짓말이다.
 *
 * 상품은 광고 제거 하나뿐이다. 이미지도 하나만 나온다.
 * 결과는 docs/store-assets/vxshop/ 에 나온다. 빌드에 포함되지 않는 위치다(용량).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'public', 'assets')
const outDir = path.join(root, 'docs', 'store-assets', 'vxshop')

const SIZE = 512
/** 게임 팔레트와 같은 색. 상점만 다른 색이면 다른 게임처럼 보인다. */
const ACCENT = '#4de1ff'
const KILL = '#ff5a6e'

/** 배경. 우주 + 네온 링. 스프라이트가 어두워도 형체가 보이게 가운데를 띄운다. */
const background = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="44%" r="62%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.32"/>
      <stop offset="55%" stop-color="${ACCENT}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#05070f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#080b16"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  <circle cx="256" cy="228" r="172" fill="none" stroke="${ACCENT}" stroke-opacity="0.3" stroke-width="2"/>
  <circle cx="256" cy="228" r="200" fill="none" stroke="${ACCENT}" stroke-opacity="0.12" stroke-width="1"/>
  <rect x="8" y="8" width="${SIZE - 16}" height="${SIZE - 16}" rx="28"
        fill="none" stroke="${ACCENT}" stroke-opacity="0.5" stroke-width="3"/>
</svg>`)

/**
 * 광고 아이콘 위의 금지 사선과 코인 옆의 ×2.
 * 스프라이트 위에 얹어야 하므로 별도 레이어로 마지막에 합성한다.
 */
const marks = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="146" cy="222" r="92" fill="none" stroke="${KILL}" stroke-opacity="0.9" stroke-width="12"/>
  <line x1="81" y1="157" x2="211" y2="287" stroke="${KILL}" stroke-opacity="0.9"
        stroke-width="12" stroke-linecap="round"/>
  <text x="378" y="330" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700"
        fill="#ffc94d">×2</text>
</svg>`)

/**
 * 제목. 폰트 파일을 심지 않고 SVG 텍스트로 그린다.
 * sharp가 쓰는 폰트가 환경마다 다를 수 있으므로 라틴 대문자만 쓴다 —
 * 한글을 넣으면 폰트 없는 기계에서 두부가 된다.
 */
const caption = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="398" width="${SIZE}" height="114" fill="#05070f" fill-opacity="0.72"/>
  <text x="256" y="452" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700"
        letter-spacing="4" fill="#e8ecf5">NO ADS</text>
  <text x="256" y="486" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600"
        letter-spacing="2" fill="${ACCENT}">ADS OFF · COINS ×2 FOREVER</text>
</svg>`)

const layers = [
  { file: 'icon_ad.webp', size: 150, x: 71, y: 147 },
  { file: 'icon_coin.webp', size: 190, x: 262, y: 128 },
]

async function build() {
  const sprites = await Promise.all(
    layers.map(async (l) => ({
      input: await sharp(path.join(assets, l.file))
        .resize(l.size, l.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left: l.x,
      top: l.y,
    })),
  )

  const out = path.join(outDir, 'carom-no-ads.png')
  await sharp(background)
    .composite([...sprites, { input: marks, left: 0, top: 0 }, { input: caption, left: 0, top: 0 }])
    .png()
    .toFile(out)

  console.log(`carom-no-ads.png  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
  console.log(`\n→ ${path.relative(root, outDir)}`)
}

fs.mkdirSync(outDir, { recursive: true })
await build()
