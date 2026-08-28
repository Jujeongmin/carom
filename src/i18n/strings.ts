/**
 * UI 문자열 사전.
 *
 * 한 곳에 모아둔다. 화면 파일에 한국어를 흩어두면 번역을 추가할 때마다
 * 빠뜨린 문장을 찾아 파일을 뒤져야 한다.
 *
 * 게임 안 고유명(STAGE, SHOP, RANKING, CAROM, VX, 스킨 이름)은 번역하지 않는다 —
 * 로고·에셋과 같은 표기라서 언어를 바꿨을 때 오히려 다른 게임처럼 보인다.
 *
 * {n} 같은 자리표시자는 t()의 두 번째 인자로 채운다.
 */

export const LANGS = ['ko', 'en', 'zh-Hans', 'zh-Hant'] as const
export type Lang = (typeof LANGS)[number]

/** 언어 선택 버튼에 쓸 이름. 각 언어를 그 언어로 적는다. */
export const LANG_LABEL: Record<Lang, string> = {
  ko: '한국어',
  en: 'EN',
  'zh-Hans': '简体',
  'zh-Hant': '繁體',
}

type Entry = Record<Lang, string>

export const STRINGS = {
  // ─── 타이틀 ───
  'title.cleared': {
    ko: '스테이지 {n} 클리어',
    en: 'Stage {n} cleared',
    'zh-Hans': '已通关第 {n} 关',
    'zh-Hant': '已通關第 {n} 關',
  },
  'title.firstHint': {
    ko: '누르고 반대로 당겼다 떼면 발사',
    en: 'Press, pull back, release to shoot',
    'zh-Hans': '按住后向反方向拉，松手发射',
    'zh-Hant': '按住後向反方向拉，放開發射',
  },
  'title.continue': {
    ko: 'STAGE {n} 이어하기',
    en: 'Continue · Stage {n}',
    'zh-Hans': '继续 · 第 {n} 关',
    'zh-Hant': '繼續 · 第 {n} 關',
  },
  'title.start': { ko: '시작', en: 'Start', 'zh-Hans': '开始', 'zh-Hant': '開始' },
  'title.shop': { ko: '상점', en: 'Shop', 'zh-Hans': '商店', 'zh-Hant': '商店' },
  'title.rank': { ko: '랭킹', en: 'Ranking', 'zh-Hans': '排行榜', 'zh-Hant': '排行榜' },
  'title.settings': { ko: '설정', en: 'Settings', 'zh-Hans': '设置', 'zh-Hant': '設定' },

  // ─── 설정 ───
  'settings.title': { ko: 'SETTINGS', en: 'SETTINGS', 'zh-Hans': 'SETTINGS', 'zh-Hant': 'SETTINGS' },
  'settings.music': { ko: '배경음', en: 'Music', 'zh-Hans': '背景音乐', 'zh-Hant': '背景音樂' },
  'settings.sfx': { ko: '효과음', en: 'Sound effects', 'zh-Hans': '音效', 'zh-Hant': '音效' },
  'settings.lang': { ko: '언어', en: 'Language', 'zh-Hans': '语言', 'zh-Hant': '語言' },

  // ─── 목표 ───
  'obj.noNeutral': {
    ko: '회색 공에 닿으면 실패',
    en: 'Touching a grey ball fails',
    'zh-Hans': '碰到灰球即失败',
    'zh-Hant': '碰到灰球即失敗',
  },
  'obj.bankShot': {
    ko: '직접 못 부숨 · 한 번 튕겨서',
    en: 'No direct hits · bank first',
    'zh-Hans': '不可直接击碎 · 需先反弹',
    'zh-Hant': '不可直接擊碎 · 需先反彈',
  },
  'obj.inOrder': {
    ko: '번호 순서대로만',
    en: 'In numbered order only',
    'zh-Hans': '必须按编号顺序',
    'zh-Hant': '必須按編號順序',
  },

  // ─── 변주 ───
  'mod.swift': { ko: '공이 빠름', en: 'Faster balls', 'zh-Hans': '球速更快', 'zh-Hant': '球速更快' },
  'mod.shortLine': {
    ko: '조준선 짧음',
    en: 'Shorter aim line',
    'zh-Hans': '瞄准线更短',
    'zh-Hant': '瞄準線更短',
  },
  'mod.tightTime': {
    ko: '시간 촉박',
    en: 'Tighter clock',
    'zh-Hans': '时间更紧',
    'zh-Hant': '時間更緊',
  },
  'mod.noSlow': {
    ko: '조준해도 안 느려짐',
    en: 'No slow-motion',
    'zh-Hans': '瞄准不减速',
    'zh-Hant': '瞄準不減速',
  },

  // ─── 게임 ───
  'game.targets': {
    ko: '타깃 {a}/{b}',
    en: 'Targets {a}/{b}',
    'zh-Hans': '目标 {a}/{b}',
    'zh-Hant': '目標 {a}/{b}',
  },
  'game.hint': {
    ko: '누르면 느려짐 · 반대로 당겼다 떼면 발사',
    en: 'Hold to slow time · pull back and release',
    'zh-Hans': '按住减速 · 向反方向拉后松手',
    'zh-Hant': '按住減速 · 向反方向拉後放開',
  },
  'game.hintNoSlow': {
    ko: '이번 판은 안 느려짐 · 반대로 당겼다 떼면 발사',
    en: 'No slow-motion here · pull back and release',
    'zh-Hans': '本关不减速 · 向反方向拉后松手',
    'zh-Hant': '本關不減速 · 向反方向拉後放開',
  },
  'game.adDouble': {
    ko: '광고 보고 코인 2배',
    en: 'Watch ad · double coins',
    'zh-Hans': '观看广告 · 金币双倍',
    'zh-Hant': '觀看廣告 · 金幣雙倍',
  },
  'game.adDoubleDone': {
    ko: '코인 2배 받음',
    en: 'Doubled',
    'zh-Hans': '已翻倍',
    'zh-Hant': '已翻倍',
  },
  'game.adLoading': {
    ko: '광고 보는 중…',
    en: 'Playing ad…',
    'zh-Hans': '播放广告中…',
    'zh-Hant': '播放廣告中…',
  },
  'game.reward': { ko: '획득', en: 'Earned', 'zh-Hans': '获得', 'zh-Hant': '獲得' },
  'game.viewRank': {
    ko: '랭킹 보기',
    en: 'View ranking',
    'zh-Hans': '查看排行榜',
    'zh-Hant': '查看排行榜',
  },
  'game.next': {
    ko: '다음 스테이지',
    en: 'Next stage',
    'zh-Hans': '下一关',
    'zh-Hant': '下一關',
  },
  'game.toTitle': {
    ko: '타이틀로',
    en: 'Back to title',
    'zh-Hans': '返回标题',
    'zh-Hant': '返回標題',
  },
  'game.destroyed': {
    ko: '타깃 {a}/{b} 파괴',
    en: '{a}/{b} targets destroyed',
    'zh-Hans': '已击碎目标 {a}/{b}',
    'zh-Hant': '已擊碎目標 {a}/{b}',
  },
  'game.revive': { ko: '부활', en: 'Revive', 'zh-Hans': '复活', 'zh-Hant': '復活' },
  'game.adRevive': {
    ko: '광고 보고 부활',
    en: 'Watch ad · revive',
    'zh-Hans': '观看广告 · 复活',
    'zh-Hant': '觀看廣告 · 復活',
  },
  'game.buyContinue': {
    ko: '코인 {n}으로 부활',
    en: 'Revive for {n} coins',
    'zh-Hans': '花费 {n} 金币复活',
    'zh-Hant': '花費 {n} 金幣復活',
  },
  'game.retry': { ko: '다시하기', en: 'Retry', 'zh-Hans': '重来', 'zh-Hant': '重來' },

  // ─── 조준선 색 ───
  'legend.miss': { ko: '빗나감', en: 'Miss', 'zh-Hans': '未命中', 'zh-Hant': '未命中' },
  'legend.break': { ko: '부순다', en: 'Breaks it', 'zh-Hans': '击碎', 'zh-Hant': '擊碎' },
  'legend.chain': {
    ko: '폭발 연쇄',
    en: 'Chain blast',
    'zh-Hans': '连锁爆炸',
    'zh-Hant': '連鎖爆炸',
  },
  'legend.fail': { ko: '실패', en: 'You die', 'zh-Hans': '失败', 'zh-Hant': '失敗' },
  'legend.failHere': {
    ko: '여기서 실패',
    en: 'You die there',
    'zh-Hans': '在此失败',
    'zh-Hant': '在此失敗',
  },

  // ─── 튜토리얼 ───
  'tut.s1.title': {
    ko: '당겼다 떼면 발사',
    en: 'Pull back, release',
    'zh-Hans': '拉后松手发射',
    'zh-Hant': '拉後放開發射',
  },
  'tut.s1.body': {
    ko: '화면을 누른 채 가고 싶은 방향의 반대로 당긴다. 멀리 당길수록 세게 나간다.',
    en: 'Hold the screen and drag away from where you want to go. Farther means harder.',
    'zh-Hans': '按住屏幕，朝想去方向的反方向拖动。拖得越远，力道越大。',
    'zh-Hant': '按住螢幕，朝想去方向的反方向拖曳。拖得越遠，力道越大。',
  },
  'tut.s2.title': {
    ko: '선은 결과를 미리 보여준다',
    en: 'The line shows the outcome',
    'zh-Hans': '瞄准线预示结果',
    'zh-Hant': '瞄準線預示結果',
  },
  'tut.s2.body': {
    ko: '떼기 전에 공이 어디로 튀고 무엇을 부수는지 그대로 나온다.',
    en: 'Before you release, it shows where the ball goes and what it breaks.',
    'zh-Hans': '松手之前就能看到球的走向和会击碎什么。',
    'zh-Hant': '放開之前就能看到球的走向和會擊碎什麼。',
  },
  'tut.s3.title': {
    ko: '금색 물체를 전부 부수면 클리어',
    en: 'Break every gold object to clear',
    'zh-Hans': '击碎所有金色物体即通关',
    'zh-Hant': '擊碎所有金色物體即通關',
  },
  'tut.s3.body': {
    ko: '제한 시간 안에. 가만히 있어서 깨지는 판은 없다.',
    en: 'Within the time limit. No stage clears itself.',
    'zh-Hans': '需在限时内完成。没有靠等待就能通关的关卡。',
    'zh-Hant': '需在限時內完成。沒有靠等待就能通關的關卡。',
  },

  // ─── 상점 ───
  'shop.tabCoin': { ko: '코인', en: 'Coins', 'zh-Hans': '金币', 'zh-Hant': '金幣' },
  'shop.equipped': { ko: '착용 중', en: 'Equipped', 'zh-Hans': '装备中', 'zh-Hant': '裝備中' },
  'shop.equip': { ko: '착용', en: 'Equip', 'zh-Hans': '装备', 'zh-Hant': '裝備' },
  'shop.cosmeticOnly': {
    ko: '외형만 바뀐다 · 성능 차이 없음',
    en: 'Looks only · no gameplay effect',
    'zh-Hans': '仅改变外观 · 无性能差异',
    'zh-Hant': '僅改變外觀 · 無性能差異',
  },
  'shop.boostOn': {
    ko: '광고 제거 적용 중 · 코인 2배',
    en: 'No Ads active · double coins',
    'zh-Hans': '去广告生效中 · 金币双倍',
    'zh-Hant': '去廣告生效中 · 金幣雙倍',
  },
  'shop.coinSource': {
    ko: '코인은 연쇄와 폭발로 얻는다',
    en: 'Coins come from chains and explosions',
    'zh-Hans': '金币来自连锁与爆炸',
    'zh-Hant': '金幣來自連鎖與爆炸',
  },
  'shop.offline': {
    ko: '서버에 연결되지 않음 · 이 기기에만 저장됨',
    en: 'Not connected · saved on this device only',
    'zh-Hans': '未连接服务器 · 仅保存在本机',
    'zh-Hant': '未連線伺服器 · 僅保存在本機',
  },
  'shop.loading': { ko: '불러오는 중…', en: 'Loading…', 'zh-Hans': '加载中…', 'zh-Hant': '載入中…' },
  'shop.loadFailed': {
    ko: '상점을 불러오지 못했습니다',
    en: 'Could not load the shop',
    'zh-Hans': '无法加载商店',
    'zh-Hant': '無法載入商店',
  },
  'shop.empty': {
    ko: '판매 중인 상품이 없습니다',
    en: 'Nothing on sale',
    'zh-Hans': '暂无在售商品',
    'zh-Hant': '暫無在售商品',
  },
  'shop.owned': { ko: '보유 중', en: 'Owned', 'zh-Hans': '已拥有', 'zh-Hant': '已擁有' },
  'shop.blocked': {
    ko: '구매 불가',
    en: 'Unavailable',
    'zh-Hans': '无法购买',
    'zh-Hant': '無法購買',
  },
  'shop.vxNote': {
    ko: '실제 결제 · 계정에 영구 적용',
    en: 'Real payment · permanent on your account',
    'zh-Hans': '真实付费 · 永久绑定账号',
    'zh-Hant': '真實付費 · 永久綁定帳號',
  },
  'shop.vxNote2': {
    ko: '스킨은 코인으로만 산다 · 순위에 영향 없음',
    en: 'Skins cost coins only · no effect on ranking',
    'zh-Hans': '皮肤只能用金币购买 · 不影响排名',
    'zh-Hant': '造型只能用金幣購買 · 不影響排名',
  },
  'shop.close': { ko: '닫기', en: 'Close', 'zh-Hans': '关闭', 'zh-Hant': '關閉' },

  // ─── 스킨 ───
  'skin.base.note': {
    ko: '기본 외형',
    en: 'Default look',
    'zh-Hans': '默认外观',
    'zh-Hant': '預設外觀',
  },
  'skin.pulse.note': {
    ko: '외형만 바뀜 · 바이올렛',
    en: 'Looks only · violet',
    'zh-Hans': '仅外观 · 紫罗兰',
    'zh-Hant': '僅外觀 · 紫羅蘭',
  },
  'skin.ember.note': {
    ko: '외형만 바뀜 · 에메랄드',
    en: 'Looks only · emerald',
    'zh-Hans': '仅外观 · 翡翠绿',
    'zh-Hant': '僅外觀 · 翡翠綠',
  },
  'vx.noAds.grants': {
    ko: '광고 제거 · 모든 클리어 코인 2배 (영구)',
    en: 'Removes ads · double coins forever',
    'zh-Hans': '去除广告 · 通关金币永久双倍',
    'zh-Hant': '去除廣告 · 通關金幣永久雙倍',
  },

  // ─── 랭킹 ───
  'rank.subtitle': {
    ko: '최고 도달 스테이지 · 클리어할 때마다 자동 등록',
    en: 'Highest stage reached · submitted on every clear',
    'zh-Hans': '最高通关关卡 · 每次通关自动提交',
    'zh-Hant': '最高通關關卡 · 每次通關自動提交',
  },
  'rank.connecting': {
    ko: '서버에 연결 중…',
    en: 'Connecting…',
    'zh-Hans': '正在连接服务器…',
    'zh-Hant': '正在連線伺服器…',
  },
  'rank.namePlaceholder': {
    ko: '닉네임 (1~15자)',
    en: 'Name (1–15 characters)',
    'zh-Hans': '昵称（1–15 个字符）',
    'zh-Hant': '暱稱（1–15 個字元）',
  },
  'rank.save': { ko: '저장', en: 'Save', 'zh-Hans': '保存', 'zh-Hant': '儲存' },
  'rank.saving': { ko: '저장 중…', en: 'Saving…', 'zh-Hans': '保存中…', 'zh-Hant': '儲存中…' },
  'rank.setName': {
    ko: '이름 설정',
    en: 'Set a name',
    'zh-Hans': '设置昵称',
    'zh-Hant': '設定暱稱',
  },
  'rank.change': { ko: '변경', en: 'change', 'zh-Hans': '更改', 'zh-Hant': '更改' },
  'rank.emptyList': {
    ko: '아직 등록된 기록이 없음',
    en: 'No records yet',
    'zh-Hans': '暂无记录',
    'zh-Hant': '暫無紀錄',
  },
  'rank.stage': {
    ko: 'STAGE {n}',
    en: 'STAGE {n}',
    'zh-Hans': '第 {n} 关',
    'zh-Hant': '第 {n} 關',
  },

  // ─── 광고 ───
  'ads.unsupported': {
    ko: '이 환경에서는 광고를 볼 수 없습니다',
    en: 'Ads are not available here',
    'zh-Hans': '当前环境无法播放广告',
    'zh-Hant': '目前環境無法播放廣告',
  },
  'ads.busy': {
    ko: '광고를 불러오는 중입니다',
    en: 'Loading the ad…',
    'zh-Hans': '正在加载广告',
    'zh-Hant': '正在載入廣告',
  },
  'ads.timeout': {
    ko: '광고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요',
    en: 'Could not load the ad. Please try again shortly.',
    'zh-Hans': '广告加载失败，请稍后再试',
    'zh-Hant': '廣告載入失敗，請稍後再試',
  },
  'ads.error': {
    ko: '광고를 볼 수 없습니다',
    en: 'Ad unavailable',
    'zh-Hans': '无法播放广告',
    'zh-Hant': '無法播放廣告',
  },
  'ads.noServer': {
    ko: '서버에 연결되지 않아 보상을 받을 수 없습니다',
    en: 'Not connected — the reward cannot be granted',
    'zh-Hans': '未连接服务器，无法发放奖励',
    'zh-Hant': '未連線伺服器，無法發放獎勵',
  },
  'ads.already': {
    ko: '이미 받은 보상입니다',
    en: 'Already claimed',
    'zh-Hans': '奖励已领取',
    'zh-Hant': '獎勵已領取',
  },
  'ads.unverified': {
    ko: '보상을 확인하지 못했습니다',
    en: 'Could not verify the reward',
    'zh-Hans': '无法确认奖励',
    'zh-Hant': '無法確認獎勵',
  },
} as const satisfies Record<string, Entry>

export type StringKey = keyof typeof STRINGS
