/**
 * Agent8 Game Server — CAROM
 *
 * 프로젝트 루트에 있어야 하며 export 하지 않는다.
 * 배포: npx -y @agent8/deploy
 *
 * 랭킹은 **최고 도달 스테이지** 하나다. 이 게임의 진행도가 곧 순위다.
 *
 * 시간은 재지 않는다. 진행 시간은 클리어한 판만 누적되고 실패한 시도는 세지 않으므로,
 * 한 번에 깬 사람과 50번 실패하고 깬 사람이 같은 시간으로 찍힌다.
 * 그런 값으로는 실력을 가릴 수 없어 동점자 정렬 기준으로 쓸 수 없다.
 * 같은 스테이지면 먼저 도달한 쪽이 위로 간다.
 *
 * 클라이언트가 보내는 값은 전부 조작 가능하다고 가정한다.
 * 서버가 할 수 있는 검증만 하고, 못 하는 것은 못 한다고 아래에 적어둔다.
 */

const MAX_STAGE = 999

/**
 * 광고 보상 표.
 * 지급량은 반드시 서버가 정한다 — 클라이언트가 보낸 result.reward는 UX 힌트일 뿐이다.
 * placementId는 클라이언트의 src/net/ads.ts PLACEMENT와 같아야 한다.
 */
const REWARD_TABLE = {
  'carom-revive': { amount: 1, type: 'revive' },
  'carom-double-coins': { amount: 1, type: 'coin-2x' },
}

const ADS_VERIFIER = 'https://ads-verifier.verse8.io/ads/status'

/**
 * 코인 상점 가격표. 클라이언트가 보낸 가격은 절대 쓰지 않는다.
 * src/shop.ts의 SKINS와 같아야 한다.
 */
const SKIN_PRICES = {
  pulse: 200,
  ember: 700,
}

/**
 * VX 상품표 — **하나뿐이다**. 대시보드에 등록한 Product ID와 정확히 같아야 한다.
 *
 * 광고 제거를 사면 코인이 항상 2배가 된다.
 * 이건 덤이 아니라 광고를 없앴으니 당연히 따라와야 하는 것이다 —
 * "코인 2배" 보상형 광고가 사라지는데 그 이득까지 같이 사라지면
 * 돈을 낸 사람이 안 낸 사람보다 코인을 덜 벌게 된다.
 *
 * 스킨은 VX로 팔지 않는다. 코인으로만 산다 — 코인을 모을 이유가 있어야
 * 코인 2배가 값어치를 갖고, 그래야 이 상품이 팔린다.
 *
 * 리더보드는 최고 도달 스테이지다. 이 상품은 진행 속도를 바꾸지 않으므로
 * 순위에 영향을 주지 않는다.
 */
const VX_PRODUCTS = {
  'carom-no-ads': { noAds: true, coinBoost: 2 },
}

/**
 * 스테이지당 코인 상한.
 * 서버가 시뮬레이션을 재현하지 않으므로 정확한 검증은 불가능하다.
 * 무제한 발급만 막는 선이고, 그 한계를 숨기지 않는다.
 */
const MAX_COINS_PER_STAGE = 200

/** 로컬에서 올릴 수 있는 코인 상한. 저장값을 고쳐 온 것을 그대로 받지 않는다. */
const MAX_MIGRATE_COINS = 2000

/** 저장된 상태가 비어 있거나 깨져 있어도 게임이 돌아가야 한다. */
function normalizeWallet(state) {
  const s = state ?? {}
  const owned = Array.isArray(s.owned) ? s.owned : []
  return {
    coins: Math.max(0, Math.floor(Number(s.coins) || 0)),
    reached: Math.max(1, Math.floor(Number(s.reached) || 1)),
    owned: owned.includes('base') ? owned : ['base', ...owned],
    equipped: typeof s.equipped === 'string' ? s.equipped : 'base',
    coinBoost: Number(s.coinBoost) > 1 ? Number(s.coinBoost) : 1,
    noAds: s.noAds === true,
    purchases: Array.isArray(s.purchases) ? s.purchases : [],
    migrated: s.migrated === true,
  }
}

/**
 * 검증자에게 이 requestId가 실제로 시청 완료됐는지 묻는다.
 * pending이면 잠깐 기다렸다 다시 묻되, 무한정 매달리지 않는다.
 */
async function verifyWithAdsService(requestId, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${ADS_VERIFIER}?requestId=${encodeURIComponent(requestId)}`)
    if (!res.ok && res.status !== 202) return false

    const body = await res.json()
    if (body.status === 'verified') return true
    if (body.status === 'pending') {
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }
    return false // dismissed | failed
  }
  return false
}

class Server {
  /**
   * 도달 스테이지를 등록한다. 클라이언트가 스테이지를 깰 때마다 자동으로 부른다.
   * 낮은 스테이지로 다시 불려도 기록은 내려가지 않는다.
   * @param {number} stage 클리어한 가장 높은 스테이지
   * @param {string} nickname 표시 이름
   */
  async submitProgress(stage, nickname) {
    const s = this._validStage(stage)
    const name = this._validNick(nickname)

    const existing = await this._myProgress()

    // 계정당 하나만 남긴다. 여러 개 쌓이면 상위권이 한 사람으로 채워진다.
    if (existing) {
      const higher = s > existing.stage
      const renamed = name !== existing.nickname

      if (!higher && !renamed) return { updated: false, entry: existing }

      // 이름만 바뀐 경우 updatedAt은 그대로 둔다.
      // 동점 정렬이 "먼저 도달한 순"이므로 개명이 순위를 떨어뜨리면 안 된다.
      const next = {
        __id: existing.__id,
        account: existing.account,
        nickname: name,
        stage: higher ? s : existing.stage,
        updatedAt: higher ? Date.now() : existing.updatedAt,
      }

      const via = await this._writeRow(next)

      // 낙관적으로 돌려주지 않는다. 정말 저장됐는지 다시 읽어서 그 값을 준다.
      // 저장에 실패했는데 updated: true를 돌려준 것이 이 버그를 오래 숨겼다.
      const saved = await this._myProgress()
      const ok = saved?.stage === next.stage && saved?.nickname === name
      return { updated: ok, via, entry: saved }
    }

    const entry = await $global.addCollectionItem('rankings', {
      account: $sender.account,
      stage: s,
      nickname: name,
      updatedAt: Date.now(),
    })
    return { updated: true, entry }
  }

  /** 상위 20명. 같은 스테이지면 먼저 도달한 쪽이 위. */
  async getTopRankings() {
    const rows = await $global.getCollectionItems('rankings', {
      orderBy: [{ field: 'stage', direction: 'desc' }],
      limit: 50,
    })
    return rows.sort((a, b) => b.stage - a.stage || a.updatedAt - b.updatedAt).slice(0, 20)
  }

  /** 내 전체 순위. 기록이 없으면 rank -1. */
  async getMyRank() {
    const mine = await this._myProgress()
    if (!mine) return { entry: null, rank: -1 }

    const above = await $global.countCollectionItems('rankings', {
      filters: [{ field: 'stage', operator: '>', value: mine.stage }],
    })
    const sameStage = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'stage', operator: '==', value: mine.stage }],
    })
    const earlier = sameStage.filter((e) => e.updatedAt < mine.updatedAt).length

    return { entry: mine, rank: above + earlier + 1 }
  }

  // ─────────────── 지갑 · 진행 (서버 권위) ───────────────

  /** 내 지갑과 진행. 클라이언트는 이걸 읽어서 표시만 한다. */
  async getWallet() {
    return normalizeWallet(await $global.getMyState())
  }

  /**
   * 스테이지를 깼다. 코인을 적립하고 도달 스테이지를 갱신한다.
   *
   * 서버는 시뮬레이션을 재현하지 않으므로 "이 판에서 정말 그만큼 벌었는가"를 확인할 수 없다.
   * 대신 스테이지당 상한을 두어 무제한 발급만 막는다. 이것이 지금 할 수 있는 최선이고,
   * 못 하는 것은 못 한다고 여기 적어둔다.
   */
  async recordClear(stage, coinsEarned) {
    const s = this._validStage(stage)
    const earned = Math.max(0, Math.min(Math.floor(Number(coinsEarned) || 0), MAX_COINS_PER_STAGE))

    const w = normalizeWallet(await $global.getMyState())
    // 코인 부스트는 상한을 적용한 뒤에 곱한다. 상한을 우회하는 통로가 되면 안 된다.
    const credited = Math.floor(earned * w.coinBoost)
    const next = {
      ...w,
      coins: w.coins + credited,
      reached: Math.max(w.reached, s + 1),
    }
    await $global.updateMyState(next)
    return next
  }

  /** 코인을 쓴다. 잔액 판정은 서버가 한다. */
  async spendCoins(amount, reason) {
    const cost = Math.floor(Number(amount) || 0)
    if (cost <= 0) return { ok: false, reason: 'invalid_amount' }

    const w = normalizeWallet(await $global.getMyState())
    if (w.coins < cost) return { ok: false, reason: 'insufficient' }

    const next = { ...w, coins: w.coins - cost }
    await $global.updateMyState(next)
    return { ok: true, wallet: next, spentOn: String(reason ?? '') }
  }

  /** 스킨 구매. 가격은 서버 표에서 정한다 — 클라이언트가 보낸 가격을 받지 않는다. */
  async buySkin(skinId) {
    const price = SKIN_PRICES[skinId]
    if (price === undefined) return { ok: false, reason: 'unknown_skin' }

    const w = normalizeWallet(await $global.getMyState())
    if (w.owned.includes(skinId)) return { ok: false, reason: 'already_owned' }
    if (w.coins < price) return { ok: false, reason: 'insufficient' }

    const next = {
      ...w,
      coins: w.coins - price,
      owned: [...w.owned, skinId],
      equipped: skinId,
    }
    await $global.updateMyState(next)
    return { ok: true, wallet: next }
  }

  async equipSkin(skinId) {
    const w = normalizeWallet(await $global.getMyState())
    if (!w.owned.includes(skinId)) return { ok: false, reason: 'not_owned' }
    const next = { ...w, equipped: skinId }
    await $global.updateMyState(next)
    return { ok: true, wallet: next }
  }

  /**
   * 서버가 없던 시절 로컬에 쌓인 진행을 한 번만 올린다.
   * 도달 스테이지는 큰 쪽을 취하고, 코인은 이미 올린 적이 없을 때만 더한다.
   */
  async migrateLocal(reached, coins, owned) {
    const w = normalizeWallet(await $global.getMyState())
    if (w.migrated) return { ok: false, reason: 'already_migrated', wallet: w }

    const next = {
      ...w,
      migrated: true,
      reached: Math.max(w.reached, Math.max(1, Math.floor(Number(reached) || 1))),
      coins: w.coins + Math.max(0, Math.min(Math.floor(Number(coins) || 0), MAX_MIGRATE_COINS)),
      owned: [...new Set([...w.owned, ...(Array.isArray(owned) ? owned : [])])],
    }
    await $global.updateMyState(next)
    return { ok: true, wallet: next }
  }

  // ─────────────── VXShop ───────────────

  /**
   * VX 결제가 완료되면 플랫폼이 호출한다.
   * 클라이언트를 거치지 않으므로 이 경로로 들어온 것만 실제 결제다.
   */
  async $onItemPurchased({ account, purchaseId, productId }) {
    const product = VX_PRODUCTS[productId]
    if (!product) return { success: false, error: 'unknown_product' }

    const w = normalizeWallet(await $global.getUserState(account))

    // 같은 결제가 두 번 들어와도 한 번만 반영한다.
    if (w.purchases.includes(purchaseId)) return { success: true }

    const next = {
      ...w,
      purchases: [...w.purchases, purchaseId],
      noAds: w.noAds || product.noAds === true,
      coinBoost: product.coinBoost ? Math.max(w.coinBoost, product.coinBoost) : w.coinBoost,
    }

    await $global.updateUserState(account, next)
    return { success: true }
  }

  // ─────────────── 광고 보상 검증 ───────────────

  /**
   * 광고 시청을 서버에서 확인하고 보상을 승인한다.
   *
   * 클라이언트의 `status === 'rewarded'`만 믿으면 같은 requestId를 반복해서 보내
   * 보상을 무한히 받을 수 있다. 검증자에게 직접 물어보고, 이미 지급한
   * (계정, requestId) 쌍을 기록해 재사용을 막는다.
   *
   * @param {number} [earnedThisStage] 코인 2배일 때 그 판에서 번 코인(상한 적용됨)
   * @returns {Promise<{granted: boolean, reason?: string}>}
   */
  async redeemAdReward(requestId, placementId, earnedThisStage) {
    if (typeof requestId !== 'string' || !requestId) {
      return { granted: false, reason: 'missing_requestId' }
    }
    const reward = REWARD_TABLE[placementId]
    // 클라이언트가 보낸 placementId를 표와 대조한다. 모르는 값은 거부.
    if (!reward) return { granted: false, reason: 'unknown_placement' }

    // 이미 지급한 요청인지 먼저 본다. 검증자는 같은 requestId에 계속 verified를
    // 돌려주므로, 재사용 차단은 우리 쪽 기록으로만 할 수 있다.
    const seen = await $global.getCollectionItems('ad_grants', {
      filters: [{ field: 'requestId', operator: '==', value: requestId }],
    })
    if (seen.length) return { granted: false, reason: 'already_granted' }

    if (!(await verifyWithAdsService(requestId))) {
      return { granted: false, reason: 'verification_failed' }
    }

    await $global.addCollectionItem('ad_grants', {
      account: $sender.account,
      requestId,
      placementId,
      grantedAt: Date.now(),
    })

    // 코인은 서버가 직접 넣는다. 클라이언트에게 "이만큼 넣어라"라고 시키지 않는다.
    if (reward.type === 'coin-2x') {
      const w = normalizeWallet(await $global.getMyState())

      // 광고 제거를 산 사람은 적립 시점에 이미 2배를 받았다. 여기서 또 주면 4배가 된다.
      // 클라이언트가 버튼을 숨기지만 그건 UI일 뿐이라 서버가 막아야 한다.
      if (w.noAds) return { granted: false, reason: 'already_doubled' }

      const bonus = Math.max(
        0,
        Math.min(Math.floor(Number(earnedThisStage) || 0), MAX_COINS_PER_STAGE),
      )
      const next = { ...w, coins: w.coins + bonus }
      await $global.updateMyState(next)
      return { granted: true, type: reward.type, wallet: next }
    }

    return { granted: true, type: reward.type, amount: reward.amount }
  }

  // ─────────────── 내부 ───────────────

  _validStage(stage) {
    if (typeof stage !== 'number' || !Number.isFinite(stage) || stage < 1 || stage > MAX_STAGE) {
      throw new Error('Invalid stage.')
    }
    return Math.floor(stage)
  }

  /**
   * 기존 랭킹 행을 덮어쓴다.
   *
   * 어느 API가 실제로 저장되는지 이 환경에서 확인할 방법이 배포뿐이라
   * 세 경로를 순서대로 시도하고, **쓴 뒤 다시 읽어서** 먹었는지 확인한다.
   * 어느 쪽이 통했는지 이름으로 돌려주므로, 확인되면 나머지를 지우면 된다.
   *
   * 실제로 겪은 것: updateCollectionItem은 3인자로 불러도, 문서대로 2인자로 불러도
   * 예외 없이 조용히 아무것도 저장하지 않았다. 그래서 계정마다 첫 기록에서
   * 랭킹이 멈춰 있었다. 조용한 실패는 재확인 없이는 못 잡는다.
   */
  async _writeRow(next) {
    const stuck = async () => {
      const now = await this._myProgress()
      return !(now?.stage === next.stage && now?.nickname === next.nickname)
    }

    try {
      await $global.updateCollectionItem('rankings', next)
      if (!(await stuck())) return 'update'
    } catch (e) {
      console.warn('updateCollectionItem failed:', e?.message)
    }

    // 문서: addCollectionItem에 이미 있는 __id를 주면 기존 항목에 필드가 병합된다.
    try {
      await $global.addCollectionItem('rankings', next)
      if (!(await stuck())) return 'add-merge'
    } catch (e) {
      console.warn('addCollectionItem merge failed:', e?.message)
    }

    // 마지막 수단. 지웠다 다시 넣는다 — __id는 새로 받되 내용은 그대로다.
    try {
      await $global.deleteCollectionItem('rankings', next.__id)
      const { __id, ...row } = next
      await $global.addCollectionItem('rankings', row)
      if (!(await stuck())) return 'delete-add'
    } catch (e) {
      console.warn('delete+add failed:', e?.message)
    }

    return 'none'
  }

  _validNick(nickname) {
    if (typeof nickname !== 'string') throw new Error('Invalid nickname.')
    const name = nickname.trim()
    if (name.length < 1 || name.length > 15) {
      throw new Error('Nickname must be between 1 and 15 characters.')
    }
    return name
  }

  async _myProgress() {
    const rows = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'account', operator: '==', value: $sender.account }],
    })
    if (!rows.length) return null
    return rows.sort((a, b) => b.stage - a.stage)[0]
  }

}
