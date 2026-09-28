# Structure — CAROM

## 루트

### `server.js`

Agent8 서버 함수. 루트에 있어야 하고 `export`를 쓰지 않는다. 지갑(`getWallet` `recordClear` `spendCoins` `buySkin` `equipSkin` `migrateLocal`), 랭킹(`submitProgress` `getTopRankings` `getMyRank`), 광고 보상(`redeemAdReward`), 결제(`$onItemPurchased`)를 담당한다. `SKIN_PRICES`와 VX 상품표가 여기 있다 — 가격의 단일 출처.

### `vite.config.ts`

React 플러그인만. 포트는 `PORT` 환경변수 우선, 없으면 5173 — 박아두면 다른 세션의 dev 서버와 부딪힌다.

### `index.html` · `public/`

진입 HTML과 정적 에셋(webp 스프라이트, 아이콘, `manifest.webmanifest`).

## `src/` — 진입과 화면

### `main.tsx`

`createRoot`로 `<App />` 마운트. `index.css` 임포트.

### `App.tsx`

화면 전환(Title ↔ Game)과 모달(Shop / Ranking / Settings)을 관리한다. 지갑(`useWallet`)과 랭킹(`useRanking`)을 여기서 들고, 클리어 하나에 붙는 두 가지 — 지갑 적립과 랭킹 자동 등록 — 을 `handleCleared`에서 함께 처리한다. `?stage=N`이 있으면 타이틀을 건너뛴다.

### `index.css` · `app.css`

`index.css`는 전역 토큰(색 변수, 디스플레이/UI 폰트, `color-scheme: dark`)과 리셋. `app.css`는 화면 스타일. **Tailwind를 쓰지 않는다.**

### `features.ts`

아직 붙지 않은 기능의 스위치. 구현되지 않은 것이 눌리지 않게 막는다. 현재 `ADS_ENABLED`.

### `shop.ts`

코인 상점 정의. 스킨 목록과 가격. **`server.js`의 `SKIN_PRICES`와 반드시 같아야 한다** — 차감은 서버가 한다.

### `progress.ts`

오프라인 전용 진행 저장. 서버에 연결되면 지갑은 서버가 소유하므로, 이 파일은 서버가 없을 때만 쓰인다.

### `tutorial.ts`

튜토리얼 열람 여부. 재화가 아니라 화면 설정이라 서버에 두지 않는다.

### `assets.json`

스캐폴드 잔재. 비어 있고(`{"images":{}}`) 실제 스프라이트 등록은 `game/assets.ts`가 한다.

## `src/game/` — 시뮬레이션 (React·DOM 모름)

| 파일 | 역할 |
|---|---|
| `types.ts` | 오브젝트 종류 정의 — `target`(부숴야 함) · `hazard`(닿으면 실패) · `neutral`(각을 만드는 공) 등 |
| `config.ts` | **튜닝 숫자 전부.** 밸런스 조정은 이 파일 한 곳 편집 |
| `rng.ts` | 시드 기반 난수. 결정성의 전제 |
| `engine.ts` | 시뮬레이션 본체. 고정 timestep `step`. 클리어 보상 적립도 여기서만 |
| `physics.ts` | 원-원 충돌, 벽 반사, 포탈 통과. 해소한 충돌을 기록해 판정에 넘긴다 |
| `rules.ts` | 파괴 · 폭발 · 연쇄 규칙의 **유일한 구현**. 엔진과 조준선이 같이 부른다. 부작용 금지 |
| `foresight.ts` | 조준선. 상태를 복제해 같은 엔진으로 빨리 감는다. 2선분만 그리고 계산은 끝까지 |
| `shot.ts` | 당김 → 임펄스 변환. 16px 이내는 오터치로 취소 |
| `stage.ts` | 번호 → 스테이지. 조건·테마·모디파이어 조합과 모순 차단 |
| `assets.ts` | 스프라이트 로더. 알파 바운딩박스를 재서 지름 2r에 맞춘다 — 에셋을 다시 뽑아도 코드를 안 고친다 |
| `renderer.ts` | Canvas 2D. **상태를 읽고 그리기만 한다** |

## `src/audio/` — 소리 (파일 없이 합성)

루프 파일을 쓰면 용량이 붙고 반복이 금방 들킨다. 전부 Web Audio로 그 자리에서 만든다.

| 파일 | 역할 |
|---|---|
| `engine.ts` | 오디오 기반부 — 합성 노드와 출력 |
| `music.ts` | 배경음 |
| `sfx.ts` | 효과음. 당구 게임이라 접촉음이 제일 중요하다 |
| `index.ts` | 공개 API |

## `src/hooks/`

| 파일 | 역할 |
|---|---|
| `useGameLoop.ts` | `rAF` + 고정 timestep 1/60. 누적 시간을 쪼개 `step` 반복 후 `draw` |
| `useWallet.ts` | 서버 지갑 구독. 연결 실패 시 로컬 폴백, 최초 연결에 `migrateLocal` 1회 |
| `useRanking.ts` | 랭킹 **자동** 등록. 따로 "등록" 버튼을 두지 않는다 |
| `useAdReward.ts` | 광고 보상 1회 수령. 보상 가치에 따라 검증 수준을 나눈다 |

## `src/net/` — 외부 호출 격리

| 파일 | 역할 |
|---|---|
| `leaderboard.ts` | 서버 호출을 이 파일에 가둔다. UI는 서버 SDK를 직접 모른다 |
| `ads.ts` | Verse8 Ads 래퍼. UI는 광고 SDK를 직접 모른다 |

## `src/i18n/`

| 파일 | 역할 |
|---|---|
| `strings.ts` | 언어 목록과 문자열 테이블 (한국어 · English · 简体 · 繁體) |
| `index.ts` | 모듈 상태 + `useSyncExternalStore`. React 컨텍스트를 쓰지 않는 이유는 `net/ads.ts`처럼 컴포넌트가 아닌 곳에서도 사용자에게 보일 문장을 만들기 때문. 브라우저 설정에서 자동 선택하고 중국어는 지역까지 본다 |

## `src/ui/`

| 파일 | 역할 |
|---|---|
| `Title.tsx` | 타이틀 — 시작 · 상점 · 랭킹 · 설정 |
| `Game.tsx` | 게임 화면. 캔버스, HUD, 클리어/실패 오버레이, 이어하기·광고 버튼 |
| `Tutorial.tsx` | 첫 판 안내 — 조작 · 조준선 색 범례 · 클리어 조건 |
| `Leaderboard.tsx` | 랭킹 목록과 닉네임 변경 |
| `Shop.tsx` | 코인 탭(스킨) · VX 탭(광고 제거) |
| `Settings.tsx` | 음량 슬라이더 등 |
| `LangSwitch.tsx` | 언어 선택. 네 개뿐이라 드롭다운을 쓰지 않는다 |
| `Coin.tsx` | 코인 표시. 잔액과 획득량을 다른 모양으로 구분한다 |

## `scripts/` — 검증과 에셋

| 파일 | 역할 |
|---|---|
| `sim.ts` | 봇이 30스테이지를 실제로 깨보는 검증 + 코인 수급 측정 (`npm run sim`) |
| `idle-check.ts` | 무입력으로 클리어되는지 — 수동적 최적해 검사 |
| `cycle-check.ts` | 설계 종류와 반복 지점 |
| `stage-table.ts` | 스테이지별 구성표 |
| `perf-foresight.ts` | 조준선 계산 비용 측정 |
| `optimize-assets.mjs` | 스프라이트 최적화(webp) |
| `make-thumbnail.mjs` · `make-vx-products.mjs` | 스토어 썸네일 · VX 상품 이미지 생성 |

## `tools/`

`process_assets.py` · `process_gen1.py` — 생성된 아트의 후처리(Python).

## `docs/`

| 경로 | 내용 |
|---|---|
| `design.md` | 설계 문서. **왜 그렇게 했는지**가 전부 적혀 있다 |
| `asset-prompts.md` | 아트 생성 프롬프트 |
| `screenshots/` | README용 인게임 캡쳐 |
| `store-assets/` | 스토어 등록용 원본 이미지, `vxshop/` 상품 썸네일 |
