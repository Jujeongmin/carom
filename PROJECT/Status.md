# Status — CAROM

## 구현됨

### 게임 코어

- 결정적 시뮬레이션 (`game/engine.ts`) — 고정 timestep 1/60, 시드 기반 난수
- 원-원 충돌 · 벽 반사 · 포탈 통과 (`game/physics.ts`), 재진입 금지 0.35초
- 파괴 · 폭발 · 연쇄 규칙 단일 구현 (`game/rules.ts`)
- 조준선 (`game/foresight.ts`) — 상태 복제 후 빨리 감기, 2선분 표시 / 계산은 끝까지
- 새총 조작 (`game/shot.ts`) — 당김 → 임펄스, 16px 이내는 오터치 취소
- 조준 중 물리 0.18배 감속 (제한 시간은 실제 속도)
- Canvas 2D 렌더 (`game/renderer.ts`) — 읽기 전용, 알파 바운딩박스 기준 스프라이트 정규화

### 스테이지

- 번호 하나에서 전부 유도 (`game/stage.ts`) — 조건 6주기 × 테마 9주기 × 모디파이어 7주기, 최소공배수 126
- 조건 4종: `destroyAll` · `noNeutral` · `bankShot` · `inOrder`
- 테마 9종: `open` `pillars` `corridor` `barrier` `scatter` `cross` `ring` `funnel` `columns`
- 모디파이어 4종: `swift` · `shortLine` · `tightTime` · `noSlow`
- 모순 조합 차단, 요소별 도입 시점 분리(위험물 3 · 폭발통 5 · 조건 7 · 포탈 8 · 모디파이어 10)
- 시작 1.4초 무적

### 진행 · 경제

- 지갑 서버 소유 (`server.js` `$global.getMyState/updateMyState`) — 코인 · 도달 · 보유 스킨 · 장착 · 코인부스트 · 광고제거 · 구매이력
- 클리어 보상 `10 + 타깃수 × 2`, 연쇄 · 폭발 보너스
- 이어하기 `60 + 20 × ⌊(stage-1)/10⌋`, 스테이지당 1회 제한
- 스킨 3종 — STANDARD(기본) · PULSE(200) · JADE(700, 내부 id `ember`). 외형만 바뀌고 성능 차이 없음
- 오프라인 폴백 + 최초 연결 시 `migrateLocal` 1회

### 랭킹

- 최고 도달 스테이지 기준, 클리어 시 자동 등록 (`useRanking.submit`)
- 닉네임 자동 생성(`PLAYER-XXXX`) · 변경. 개명 시 `updatedAt` 보존(동점은 먼저 도달한 순)
- 계정당 기록 1개 유지
- 쓰기 경로 3중화

### 광고 · 결제

- 보상형 2종 — `carom-revive`(시간 +12초) · `carom-double-coins`(그 판 코인 2배)
- 코인 지급은 서버가 직접. (계정, `requestId`) 기록으로 재사용 차단, 스테이지당 상한 200
- 검증 불가 ≠ 거절 — 명시적 부정일 때만 거절
- VX 상품 1종 `carom-no-ads`(100 VX) — 광고 제거 + 클리어 코인 영구 2배. `$onItemPurchased`만 지급, `purchaseId` 중복 방지
- `noAds` 계정의 코인 2배 재요청은 `already_doubled`로 거절

### UI · 주변

- 화면 — Title / Game / Leaderboard / Shop / Settings / Tutorial
- 첫 판 튜토리얼 (조작 · 조준선 색 범례 · 클리어 조건)
- 4개 언어 — 한국어 · English · 简体中文 · 繁體中文. 브라우저 설정에서 자동 선택(중국어는 지역까지 확인)
- 사운드 — 배경음 · 효과음, 설정 슬라이더 (`src/audio/`)
- 클리어 화면에 획득 코인 표시
- `?stage=N` 쿼리로 특정 스테이지 바로 열기 (개발용)

### 검증 도구

`npm run sim` · `idle-check` · `cycle-check` · `stage-table` · `perf-foresight`

**최근 측정값** — 서로 다른 설계 108가지 · 처음 겹치는 지점 44스테이지 · 봇 클리어율 29/30 · 무입력 클리어 0/20 · 클리어당 코인 평균 42.1(최소 16, 최대 64) · 조준선 비용 데스크톱 0.10ms(물체 25개)

## 남은 것

- 클리어 / 실패 연출 (현재는 텍스트 오버레이만)
- 자동화 테스트 없음 — 검증은 시뮬레이션 스크립트에 의존
- `src/assets.json`은 비어 있음(`{"images":{}}`). 스프라이트 등록은 `src/game/assets.ts`가 담당하므로 실사용되지 않는다
