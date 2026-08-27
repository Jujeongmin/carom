# 빌드에 넣지 않는 에셋

앱이 로드하지 않는 파일들. `public/`에 두면 빌드 결과에 그대로 복사돼
용량만 차지하므로 여기로 옮겨뒀다. 필요하면 다시 `public/assets/`로 옮기면 된다.

| 파일 | 용도 |
|---|---|
| `cover_store.png` | 스토어 등록용 커버. 앱은 안 씀 |
| `app_icon_1024.png` | 스토어 제출용 고해상도 아이콘. manifest는 512까지만 씀 |
| `splash_portrait.png` | **폐기.** 옛 게임(PUSHWAVE) 그림 |
| `cover_store_pushwave.png` | 옛 커버 백업 |
| `logo_title_pushwave.png` · `logo_title_deadline.png` | 옛 로고 백업 |
| `icon_energy.png` · `icon_shield.png` | **폐기.** CAROM엔 에너지도 실드도 없다 |
| `icon_settings.png` | 설정 화면이 아직 없다. 만들면 되돌릴 것 |
