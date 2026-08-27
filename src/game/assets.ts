/**
 * 스프라이트 로더.
 *
 * 생성된 PNG는 캔버스 여백이 제각각이다(파편 52%, 금속 80% 등).
 * 고정 배율로 그리면 스프라이트마다 시각 크기가 어긋나고, 충돌 반경과 보이는 크기가
 * 달라져 "닿았는데 안 죽었다 / 안 닿았는데 죽었다"가 된다.
 *
 * 그래서 로드 시 알파 바운딩박스를 재고, 그 박스가 지름 2r에 정확히 맞도록 그린다.
 * 에셋을 다시 뽑아도 코드를 고칠 필요가 없다.
 */

export interface Sprite {
  img: HTMLImageElement
  /** 알파 바운딩박스 (원본 픽셀 좌표) */
  sx: number
  sy: number
  sw: number
  sh: number
}

const cache = new Map<string, Sprite>()

const NAMES = [
  'char_base',
  'char_skin_pulse',
  'char_skin_ember',
  'ob_shard_a',
  'ob_shard_b',
  'ob_asteroid_a',
  'ob_asteroid_b',
  'ob_metal_a',
  'ob_metal_b',
  'ob_bomb_a',
  'ob_bomb_b',
  'portal_ring',
  'bg_space_tile',
  'logo_title',
] as const

export type SpriteName = (typeof NAMES)[number]

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`asset load failed: ${url}`))
    img.src = url
  })
}

/** 알파 > 임계값인 픽셀의 바운딩박스. 배경 타일처럼 불투명한 이미지는 전체가 박스가 된다. */
function measureTrim(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { sx: 0, sy: 0, sw: c.width, sh: c.height }
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height).data

  let minX = c.width
  let minY = c.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { sx: 0, sy: 0, sw: c.width, sh: c.height }
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
}

export async function loadAllAssets(): Promise<void> {
  await Promise.all(
    NAMES.map(async (name) => {
      try {
        const img = await loadImage(`/assets/${name}.webp`)
        cache.set(name, { img, ...measureTrim(img) })
      } catch {
        // 에셋이 없으면 렌더러가 도형으로 대체한다. 게임은 계속 돈다.
      }
    }),
  )
}

export function sprite(name: SpriteName): Sprite | undefined {
  return cache.get(name)
}

/**
 * 알파 박스의 긴 변이 지름 2r이 되도록 그린다.
 * 결과적으로 화면에서 보이는 크기가 충돌 반경과 일치한다.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  cx: number,
  cy: number,
  radius: number,
  rotation = 0,
) {
  const longest = Math.max(s.sw, s.sh)
  const scale = (radius * 2) / longest
  const w = s.sw * scale
  const h = s.sh * scale

  if (rotation !== 0) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, -w / 2, -h / 2, w, h)
    ctx.restore()
    return
  }
  ctx.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, cx - w / 2, cy - h / 2, w, h)
}
