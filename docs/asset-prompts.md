# CAROM — 아트 에셋 생성 문서

> **ChatGPT에게 이 문서 하나만 주면 전체 에셋을 생성할 수 있도록 작성됨.**
> 아래 "생성 작업" 섹션의 프롬프트를 순서대로 하나씩 실행할 것.
> 반드시 **같은 대화 세션 안에서** 순서대로 생성할 것 — 세션을 바꾸면 톤이 어긋난다.

---

## 0. 게임 컨텍스트 (스타일 판단용)

CAROM은 세로 화면(9:16) 모바일 2D 당구 퍼즐이다.

닫힌 아레나에서 큐볼과 공들이 벽과 서로에게 튕기며 계속 움직인다. 플레이어는 화면을 누르고 반대로 당겼다 떼서(새총) 큐볼을 발사하고, 타깃을 전부 부수면 클리어다. 위험물에 닿거나 시간이 다하면 실패다.

**핵심**: 부술 것(금색 링 소행성)·죽이는 것(빨간 각진 금속)·각을 만드는 것(회색 파편)·터지는 것(주황 캐니스터)을 한눈에 구분해야 게임이 성립한다.

---

## 1. 전역 스타일 규칙

모든 생성 프롬프트에 아래 **STYLE BLOCK**을 함께 붙일 것.

```
STYLE: flat vector game art, 2D, dark space theme, soft neon rim light,
bold readable silhouette, minimal interior detail, no black outline stroke,
no text, no watermark, no signature, no drop shadow, no ground plane.

PALETTE: background #0a0a1a, player cyan #4de1ff, coin gold #ffc94d,
grey debris #8892a6, brown asteroid #a5745a, danger red #ff4d5e.

RENDER: transparent background (PNG alpha), object centered,
even lighting, no perspective, orthographic top-down view.
```

### 절대 규칙 3개

1. **둥글면 밀린다, 각지면 안 밀린다.** 돌·파편은 부드러운 조약돌 실루엣, 금속 잔해는 날카로운 직선 파셋. 이건 미적 취향이 아니라 게임 규칙의 시각화다. 둘이 헷갈리면 게임이 망가진다.
2. **디테일보다 실루엣.** 인게임 렌더 크기는 캐릭터 36px, 파편 24px 수준이다. 내부 무늬는 축소하면 전부 사라진다. 외곽 형태만 남는다는 전제로 그릴 것.
3. **배경은 조용해야 한다.** 배경이 화려하면 장애물이 안 보이고 유저가 죽는다. 저채도·저대비 유지.

---

## 2. 생성 계획 — 7회 생성 → 20개 파일

여러 오브젝트를 **한 장에 시트로** 뽑는다. 생성 횟수가 적을수록 톤이 통일된다.

| ID | 내용 | 캔버스 | 배경 |
|---|---|---|---|
| GEN-1 | 캐릭터 3종 (가로 1줄) | 1536×512 | 투명 |
| GEN-2 | 둥근 장애물 4종 (가로 1줄) | 2048×512 | 투명 |
| GEN-3 | 금속 잔해 2종 (가로 1줄) | 1024×512 | 투명 |
| GEN-4 | 배경 세로 타일 | 1024×1820 (9:16) | **불투명** |
| GEN-5 | 타이틀 로고 | 1024×512 | 투명 |
| GEN-6 | 스토어 커버 | 1280×720 | **불투명** |
| GEN-7 | UI 아이콘 8종 (4×2 그리드) | 1024×512 | 투명 |

---

## 2-1. 색 배정표 — 스킨에 쓰면 안 되는 색

플레이어(큐볼)는 **판 위의 어떤 물체와도 헷갈리면 안 된다.**
아래 색은 이미 게임 안에서 뜻을 갖고 있으므로 스킨에 쓰지 않는다.

| 색 | 이미 쓰는 곳 | 뜻 |
|---|---|---|
| 금색 #ffc94d | 타깃(운석) 글로우 · 조준선 | 부술 것 |
| 주황 #ff8c3c | 폭발통 | 연쇄 폭발 |
| 적색 #ff4d5e | 위험물 | 닿으면 죽음 |
| 회색 #8892a6 | 중립체 | 건드리면 안 될 수도 |
| 바이올렛 | 포탈 | 통과 |

남는 색: **시안**(기본 스킨) · **에메랄드/라임** · **마젠타**.
스킨끼리 비슷한 것은 상관없다 — 문제는 스킨이 *물체*와 비슷할 때다.

렌더러가 큐볼에 항상 시안 글로우와 링을 덧그리는 것도 이 때문이다
(`drawPlayer`). 스킨 색을 따라가게 만들면 이 안전장치가 사라진다.

---

## 3. 생성 작업

### GEN-1 — 캐릭터 시트

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image containing 3 variations of the player object, arranged in a
single horizontal row, evenly spaced, all exactly the same bounding box size,
on a fully transparent background.

The player is a small spherical energy core with a thin metallic containment
ring around it. It is displayed at only 36 pixels wide in game, so the
silhouette must be simple and instantly readable: a bright glowing circle
inside a darker ring. Keep interior detail minimal.

Variation 1 — cyan core #4de1ff, dark steel ring.
Variation 2 — violet core #b57bff, dark steel ring.
Variation 3 — emerald core #3ddc84, dark steel ring.

All three must be identical in shape and differ ONLY in color.
```

**잘라내기** → 각 256×256

| 파일명 | 내용 |
|---|---|
| `char_base.png` | 좌 (시안) |
| `char_skin_pulse.png` | 중 (바이올렛) |
| `char_skin_ember.png` | 우 (에메랄드) — 상점 표기는 JADE, 파일명·id는 그대로 |

> ⚠️ **3번은 원래 앰버(#ffa14d)였고, 그게 폭탄과 똑같이 생겼다.**
> 폭탄 프롬프트(GEN-3)가 "둥근 금속 통 + 빛나는 주황 코어 + 주황 #ff8c3c"라
> 스킨 3번과 형태·색 레시피가 완전히 겹쳤다. 큐볼이 판 위의 물체처럼 보이면
> 플레이어가 자기 공을 찾느라 판을 두 번 읽어야 한다.
>
> 아래 §색 배정표에 없는 색만 스킨에 쓸 것.

---

### GEN-2 — 둥근 장애물 시트

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image containing 4 objects in a single horizontal row, evenly
spaced, on a fully transparent background.

ALL 4 objects must have ROUND, soft, pebble-like silhouettes with no sharp
corners anywhere. This roundness is a gameplay signal meaning "this object
can be pushed away", so it must be obvious at a glance and at small size.

Object 1 and 2 — small rocky debris chunks, grey #8892a6.
Object 3 and 4 — larger round asteroids, warm brown #a5745a, cratered surface,
roughly twice the diameter of objects 1 and 2.

Objects 1 and 2 must look like two different chunks of the same material.
Same for objects 3 and 4.
```

**잘라내기**

| 파일명 | 내용 | 크기 |
|---|---|---|
| `ob_shard_a.png` | 1번 | 128×128 |
| `ob_shard_b.png` | 2번 | 128×128 |
| `ob_asteroid_a.png` | 3번 | 256×256 |
| `ob_asteroid_b.png` | 4번 | 256×256 |

---

### GEN-3 — 금속 잔해 시트

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image containing 2 objects in a single horizontal row, evenly
spaced, on a fully transparent background.

Both objects are angular metal wreckage with sharp geometric edges, hard
straight facets, and jagged broken corners. The angular silhouette is a
gameplay signal meaning "this object CANNOT be pushed and will kill you",
so it must look visually hostile and must NEVER be confusable with a round
rock, even when reduced to a small black silhouette.

Dark gunmetal body with glowing danger-red #ff4d5e edge highlights and a red
warning stripe on each piece.
```

**잘라내기** → 각 256×256 : `ob_metal_a.png`, `ob_metal_b.png`

> **검수 방법**: GEN-2와 GEN-3 결과를 나란히 놓고 전부 검은 실루엣으로 채웠다고 상상해 볼 것. 그래도 구분되면 통과, 아니면 GEN-3 재생성.

---

### GEN-4 — 배경 (세로 무한 타일)

> STYLE BLOCK의 `transparent background` 항목만 **무시**한다. 이건 불투명 배경이다.

```
Create a seamless vertically tileable deep space background in portrait
orientation, aspect ratio 9:16.

Requirements:
- Very dark base color #0a0a1a.
- Sparse small stars, faint blue and violet nebula wisps, very low contrast.
- The TOP edge must connect perfectly to the BOTTOM edge so the image can
  scroll vertically in an endless loop with no visible seam.
- No focal point, no large bright areas, no planets, no text, no characters.
- Gameplay objects are drawn on top of this, so the background must stay
  quiet and never compete for attention.
```

**저장** → `bg_space_tile.png` (540×960으로 리사이즈)

---

### GEN-5 — 타이틀 로고 (재생성 필요)

STYLE BLOCK + 아래 프롬프트:

```
Create a game title logo for "CAROM" on a fully transparent background.

- Bold condensed geometric sans-serif, all uppercase, tight letter spacing,
  slight forward italic slant to suggest motion.
- Cyan #4de1ff to violet #b57bff gradient across the letters, with a soft
  outer neon glow.
- A thin concentric shockwave ring arc expanding outward from behind the word.
- The word must be spelled EXACTLY: CAROM
- No tagline, no subtitle, no extra words, no author name.
```

**저장** → `logo_title.png`

> **철자 검수 필수.** 이미지 생성 모델은 텍스트에서 자주 틀린다. `CAROM` 5글자를 한 글자씩 확인할 것. 3회 시도해도 틀리면 로고를 도형만 생성하고 글자는 게임 안에서 웹폰트로 렌더하는 쪽이 빠르다.

---

### GEN-6 — 스토어 커버

> 불투명 배경.

```
Create a 16:9 store cover image for a mobile arcade game.

Scene: a small glowing cyan energy core near the lower center of the frame,
a bright expanding shockwave ring pushing grey and brown asteroids outward
in all directions, and angular red-edged metal wreckage falling from the top
of the frame. Deep dark space background #0a0a1a with faint nebula.

Composition: leave the upper-left area relatively empty so a title can be
placed there later. Dramatic, high contrast, must stay readable as a small
thumbnail. Do NOT put any text in the image.
```

**저장** → `cover_store.png` (1280×720)

---

### GEN-7 — UI 아이콘 시트

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image containing 8 game UI icons arranged in a 4x2 grid, evenly
spaced, on a fully transparent background.

All 8 icons must share one visual style: flat vector, single consistent
stroke weight, simple geometric forms, no text, no numbers, and simple
enough to stay readable at 64x64 pixels. Use gold #ffc94d as the accent
color for every icon.

Row 1: (1) a coin, (2) a lightning-bolt energy cell, (3) a shield,
       (4) a circular revive arrow.
Row 2: (5) a play triangle inside a rounded rectangle, (6) a faceted gem,
       (7) a gear, (8) a trophy.
```

**잘라내기** → 각 64×64

| 파일명 | 위치 | 용도 |
|---|---|---|
| `icon_coin.png` | 1 | 코인 |
| `icon_energy.png` | 2 | 에너지 칸 |
| `icon_shield.png` | 3 | 시작 실드 |
| `icon_revive.png` | 4 | 부활 |
| `icon_ad.png` | 5 | 보상형 광고 버튼 |
| `icon_vx.png` | 6 | VX 재화 |
| `icon_settings.png` | 7 | 설정 |
| `icon_rank.png` | 8 | 리더보드 |

---

## 4. 최종 파일 목록 (20개)

전부 `public/assets/` 아래 저장.

```
public/assets/
├── char_base.png            256×256
├── char_skin_pulse.png      256×256
├── char_skin_ember.png      256×256
├── ob_shard_a.png           128×128
├── ob_shard_b.png           128×128
├── ob_asteroid_a.png        256×256
├── ob_asteroid_b.png        256×256
├── ob_metal_a.png           256×256
├── ob_metal_b.png           256×256
├── bg_space_tile.png        540×960   (세로 seamless)
├── logo_title.png           투명
├── cover_store.png          1280×720
├── icon_coin.png            64×64
├── icon_energy.png          64×64
├── icon_shield.png          64×64
├── icon_revive.png          64×64
├── icon_ad.png              64×64
├── icon_vx.png              64×64
├── icon_settings.png        64×64
└── icon_rank.png            64×64
```

**폭발 이펙트 이미지는 생성하지 않는다.** 충격파 링과 파티클은 Canvas로 직접 그린다. 이유: 시각 반경이 물리 반경(130px)과 정확히 일치해야 하며, 이미지로 만들면 "닿았는데 안 밀렸다"는 오해가 생긴다. 이펙트 스킨은 색 팔레트만 바꿔 구현한다.

---

## 5. 검수 체크리스트

생성물마다 아래를 확인한다. 하나라도 실패하면 재생성.

- [ ] 배경이 진짜 투명한가 (흰색·검은색 사각형이 깔려 있지 않은가)
- [ ] 시트 안 항목들이 서로 겹치지 않고 균등 간격인가
- [ ] 시트 안 항목들의 크기가 지정대로인가
- [ ] **금속은 각지고 돌은 둥근가 — 검은 실루엣만 봐도 구분되는가**
- [ ] 로고 철자가 `CAROM` 정확한가
- [ ] 배경 상하를 이어 붙였을 때 이음새가 안 보이는가
- [ ] 64px로 축소해도 아이콘이 서로 구분되는가
- [ ] 워터마크·서명·잘린 글자가 없는가

---

## 6. 자주 나는 실패와 대응

| 증상 | 대응 |
|---|---|
| 앞 생성물과 톤이 어긋남 | 같은 대화에서 재요청: `Keep the exact same art style, palette and line weight as the previous image. Only change: <바뀔 것>` |
| 배경이 투명이 아님 | `Output PNG with true alpha transparency. Do not draw any background rectangle or backdrop.` |
| 시트 항목 크기 제각각 | `All items must occupy exactly the same bounding box size and sit on the same horizontal center line.` |
| 금속이 둥글게 나옴 | `Make the edges sharper and more angular. Straight facets and broken jagged corners only. Absolutely no rounded or smooth curves.` |
| 배경 이음새 보임 | 재생성보다 이미지 편집이 빠름 — 상하 20%를 서로 크로스페이드 |
| 로고 철자 틀림 | 3회 실패하면 포기하고 도형만 받은 뒤 글자는 웹폰트로 렌더 |

---

## 6-1. 1차 에셋 실측 피드백 (적용 완료)

20개 에셋을 실제로 붙이고 픽셀 단위로 측정한 결과다. **재생성할 때만 반영하면 되고, 지금 있는 에셋을 다시 뽑을 필요는 없다** — 아래 문제는 전부 코드에서 흡수했다.

### 측정으로 확인된 것

| 항목 | 결과 |
|---|---|
| 배경 상하 이음새 | **통과.** 상단 행과 하단 행 평균 밝기 차 0.02/255 — 수직 무한 스크롤에 문제 없음 |
| 로고 철자 | 지난 두 번(`PUSHWAVE`·`DEADLINE`) 모두 통과. `CAROM`으로 재생성 필요 |
| 알파 투명도 | **전부 통과.** 배경 사각형 없음 |
| 배경 내부 가로선 | y=384에 밝기 점프 1.17/255 존재. 절대 밝기가 4.9/255로 매우 어두워 실사용에서 거의 안 보임. 재생성 대상 아님 |

### 문제 1 — 불투명 영역이 캔버스를 꽉 채우지 않음

측정한 바운딩박스 비율:

| 파일 | 콘텐츠가 차지하는 비율 |
|---|---|
| `ob_shard_a` | **52%** |
| `char_base` | 66% |
| `ob_asteroid_a` | 67% |
| `ob_metal_a` | 80% |

여백 비율이 파일마다 다르면 고정 배율로 그릴 때 스프라이트마다 시각 크기가 어긋나고, **충돌 반경과 보이는 크기가 달라져 "닿았는데 안 죽었다"가 된다.** 파편이 인게임에서 안 보였던 진짜 원인도 이것이다 — 24px로 그려도 실제로는 12px만 보였다.

**대응**: 코드가 로드 시 알파 바운딩박스를 재서 그 박스가 지름 2r에 맞도록 자동 보정한다(`src/game/assets.ts`). 에셋을 다시 뽑아도 코드 수정이 필요 없다.

**재생성 시 프롬프트에 추가할 문장**:
```
The object must fill the canvas edge to edge with only a few pixels of margin.
Do not leave large empty space around the object.
```

### 문제 2 — 금속이 인게임 크기에서 배경에 묻힘

원본 `ob_metal_*`은 훌륭하다(각진 실루엣 + 빨간 발광). 그런데 52px로 축소하면 얇고 뾰족한 스파이크가 사라지고 어두운 덩어리만 남는다. **금속은 즉사 요인인데 화면에서 가장 안 보이는 물체가 되어 있었다.**

**대응**: 렌더러가 금속 뒤에 붉은 방사형 발광을 깐다. 크기와 무관하게 "위험"이 읽힌다.

**재생성 시 프롬프트에 추가할 문장**:
```
Use thick, chunky, stubby spikes rather than thin needle-like points, and make
the metal body noticeably brighter than the background. The red warning areas
must cover a large portion of the object, not just thin edge lines.
The shape must stay recognizable when scaled down to 50x50 pixels.
```

### 문제 3 — 파편 대비 부족

`ob_shard_*`은 어두운 회색이라 `#0a0a1a` 배경에서 사라진다.

**대응**: 렌더러가 옅은 림 발광을 깐다.

**재생성 시 프롬프트에 추가할 문장**:
```
Make the rock noticeably lighter than a dark background so it stays visible
at 24x24 pixels. Add a bright rim light along one edge.
```

### 추가로 필요한 에셋 (2차)

게임이 당구 스테이지 방식으로 바뀌면서 오브젝트 두 종류가 늘었다.
**현재는 도형으로 그리고 있어 게임은 정상 동작한다.** 아래 에셋이 나오면 교체한다.

기존 에셋의 역할 재배치도 함께 정리한다:

| 게임 안 역할 | 현재 쓰는 에셋 |
|---|---|
| 타깃 (부숴야 함) | `ob_asteroid_a/b` |
| 위험물 (닿으면 실패) | `ob_metal_a/b` |
| 중립구 (각을 만드는 공) | `ob_shard_a/b` |
| 큐볼 (플레이어) | `char_base` |
| 폭발통 | `ob_bomb_a/b` ✅ 적용됨 |
| 포탈 | `portal_ring` ✅ 적용됨 (두 입구 모두 같은 이미지, 회전만 다름) |
| 기둥 | 없음 — 코드로 그린다. 무채색 구조물이라 스프라이트가 필요 없다 |
| 타이틀 화면 | `splash_portrait` — **로드되지만 아직 안 쓰임.** 타이틀 화면이 없다 |

#### GEN-8 — 폭발통

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image containing 2 variations of a space explosive canister, in a
single horizontal row, evenly spaced, on a fully transparent background.

Round metal canister with a glowing orange energy core visible through a
window in the shell, and thick warning stripes. It must read as "this will
explode" instantly and must NOT be confusable with a rock or with angular
red wreckage.

Orange #ff8c3c as the dominant accent. The object must fill the canvas edge
to edge with only a few pixels of margin, and stay recognizable at 42x42 pixels.
```

**잘라내기** → 각 256×256 : `ob_bomb_a.png`, `ob_bomb_b.png`

#### GEN-9 — 포탈

STYLE BLOCK + 아래 프롬프트:

```
Create ONE image of a circular space portal ring, top-down view, on a fully
transparent background.

A glowing violet #b47bff ring with a darker swirling interior, like a gateway
seen from directly above. Symmetrical, no directional features — the same
image is used for both ends of the portal pair.

The ring must fill the canvas edge to edge with only a few pixels of margin,
and stay readable at 60x60 pixels.
```

**저장** → `portal_ring.png` (256×256)

> 포탈 두 입구는 같은 이미지를 회전시켜 쓴다. 색으로 쌍을 구분할 필요는 없다 —
> 코드가 두 입구를 점선으로 이어 같은 쌍임을 보여준다.

### UI 아이콘 현황 (GEN-7 결과물)

8개를 만들었는데 그동안 **한 개도 안 쓰이고 있었다.** 지금은 아래처럼 정리됐다.

| 파일 | 현재 용도 |
|---|---|
| `icon_coin` | **코인 표시** — HUD·상점·가격. `◎` 문자를 대체함 |
| `icon_vx` (보석) | **상점 버튼** — 타이틀 하단 |
| `icon_rank` (트로피) | **랭킹 버튼** — 타이틀 하단 |
| `icon_ad` | 미사용. Ads 붙이면 보상형 광고 버튼에 |
| `icon_revive` | 미사용. 이어하기 버튼에 붙일 수 있음 |
| `icon_settings` | 미사용. 설정 화면이 없음 |
| `icon_energy`, `icon_shield` | **폐기.** CAROM에는 에너지도 실드도 없다 (폐기된 이전 게임의 유물) |

**새 재화 에셋은 필요 없다.** `icon_coin`(별 박힌 금화)이 그대로 쓸 만하다.

다만 별 모티프가 우주 당구라는 정체성과 딱 맞지는 않는다. 바꾸고 싶다면:

```
Create a single game currency coin icon on a fully transparent background.

A gold coin seen face-on, with a thin neon cyan ring around the rim and a
simple billiard-ball motif embossed in the center. Warm gold #ffc94d as the
dominant color with a subtle cyan #4de1ff rim glow.

Flat vector, no text, no numbers. Must stay readable at 16x16 pixels —
this is displayed inline next to numbers in the HUD, very small.
The coin must fill the canvas edge to edge with only a few pixels of margin.
```

**저장** → `icon_coin.png` (64×64). 같은 경로에 덮어쓰면 코드 수정 없이 반영된다.

#### 여전히 필요 없는 것

- 폭발 이펙트 → 코드로 그린다 (§4 참고). 폭발 반경이 물리값과 정확히 일치해야 한다
- 스킨 상점 썸네일 → `char_*` 재사용
- 타이틀 화면 배경 → `bg_space_tile` + `logo_title` 조합

> **로고를 다시 만들어야 한다.** 이름이 PUSHWAVE → DEADLINE → **CAROM**으로 바뀌었다.
> 현재 `logo_title.png`는 DEADLINE이다. GEN-5 프롬프트는 이미 CAROM으로 갱신해뒀으니 그대로 재생성하면 된다.
>
> **커버(`cover_store.png`)와 스플래시(`splash_portrait.png`)도 낡았다** — 둘 다 폐기된 충격파 게임을
> 그리고 있다. 스플래시는 아예 안 쓰고 있고, 커버는 스토어 등록 전에 다시 뽑아야 한다.
> GEN-6 프롬프트도 당구 장면으로 갱신 필요.

---

## 6-2. 용량 최적화 (적용 완료)

에셋을 **WebP로 변환**해 빌드가 **7.6MB → 624KB**가 됐다.

```bash
node scripts/optimize-assets.mjs
```

| 파일 | PNG | WebP | 절감 |
|---|---|---|---|
| `bg_space_tile` | 395KB | **3KB** | 99% |
| `logo_title` | 337KB | 80KB | 76% |
| `app_icon_512` | 286KB | 24KB | 92% |
| **전체** | **1714KB** | **270KB** | **84%** |

배경이 99% 줄어든 것은 어둡고 저대비인 이미지라서다. 밴딩이 생기는지 실제 게임 화면에서
확인했고 문제 없었다. **에셋을 다시 뽑으면 이 스크립트를 한 번 돌릴 것.**

### 규칙 세 개

1. **PNG 원본은 지우지 않는다.** `docs/store-assets/`에 보관한다 — 변환이 잘못돼도 되돌릴 수
   있어야 하고, 스토어 제출에는 원본이 필요하다.
2. **`favicon_32/64`와 `apple_touch_icon`은 PNG로 남긴다.** iOS의 apple-touch-icon은 WebP를
   안정적으로 지원하지 않는다. 나머지(스프라이트·배경·로고·앱 아이콘)는 전부 WebP.
3. **앱이 로드하지 않는 파일을 `public/`에 두지 않는다.** 거기 있으면 빌드에 그대로 복사된다.
   스토어 커버·고해상도 아이콘·옛 백업은 `docs/store-assets/`로.

---

## 7. 후처리

1. 시트를 잘라 위 파일명·크기로 저장
2. PNG 알파 유지 (JPG로 저장하면 투명이 날아간다)
3. `public/assets/`에 배치
4. 인게임 실제 크기(캐릭터 36px, 파편 24px)로 축소해서 **한 화면에 모아놓고** 구분되는지 최종 확인 — 이 검사를 통과 못 하면 예쁘게 나왔어도 다시 만든다
