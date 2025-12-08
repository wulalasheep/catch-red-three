/**
 * 抓红三 - 游戏核心模块
 * 此模块包含所有游戏规则的纯函数逻辑，前端和服务器共用
 */

// ==================== 常量定义 ====================

// 花色定义
const SUITS = {
  HEART: 'heart',     // 红桃
  DIAMOND: 'diamond', // 方片
  SPADE: 'spade',     // 黑桃
  CLUB: 'club',       // 梅花
  JOKER: 'joker'      // 王
}

// 花色符号
const SUIT_SYMBOLS = {
  [SUITS.HEART]: '♥',
  [SUITS.DIAMOND]: '♦',
  [SUITS.SPADE]: '♠',
  [SUITS.CLUB]: '♣',
  [SUITS.JOKER]: '★'
}

// 花色颜色
const SUIT_COLORS = {
  [SUITS.HEART]: '#e74c3c',
  [SUITS.DIAMOND]: '#e74c3c',
  [SUITS.SPADE]: '#2c3e50',
  [SUITS.CLUB]: '#2c3e50',
  [SUITS.JOKER]: '#9b59b6'
}

// 牌面值（用于显示）
const RANK_DISPLAY = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: '小王',
  15: '大王'
}

// 牌型枚举
const CARD_TYPES = {
  SINGLE: 'single',     // 单张
  PAIR: 'pair',         // 对子
  BOMB_THREE: 'bomb3',  // 三张炸弹
  BOMB_FOUR: 'bomb4',   // 四张炸弹
  BOMB_RED3: 'bombR3',  // 双红3炸弹
  BOMB_JOKER: 'bombJ',  // 双王炸弹
  INVALID: 'invalid'    // 无效牌型
}

// ==================== 牌判断函数 ====================

// 获取牌的大小值
// 单张：大王 > 小王 > 红桃3 = 方片3 > 4 > 黑3 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 5
function getRankValue(card) {
  if (card.rank === 15) return 100 // 大王
  if (card.rank === 14) return 99  // 小王
  if (card.rank === 3 && (card.suit === SUITS.HEART || card.suit === SUITS.DIAMOND)) return 98 // 红3
  if (card.rank === 4) return 97   // 4
  if (card.rank === 3) return 96   // 黑3
  if (card.rank === 2) return 95   // 2
  if (card.rank === 1) return 94   // A
  if (card.rank === 13) return 93  // K
  if (card.rank === 12) return 92  // Q
  if (card.rank === 11) return 91  // J
  if (card.rank === 10) return 90  // 10
  if (card.rank === 9) return 89   // 9
  if (card.rank === 8) return 88   // 8
  if (card.rank === 7) return 87   // 7
  if (card.rank === 5) return 86   // 5
  return 0
}

// 判断是否是红3（红桃3或方片3）
function isRedThree(card) {
  return card.rank === 3 && (card.suit === SUITS.HEART || card.suit === SUITS.DIAMOND)
}

// 判断是否是红桃3
function isHeartThree(card) {
  return card.rank === 3 && card.suit === SUITS.HEART
}

// 判断是否是方片3
function isDiamondThree(card) {
  return card.rank === 3 && card.suit === SUITS.DIAMOND
}

// 判断是否是黑3（黑桃3或梅花3）
function isBlackThree(card) {
  return card.rank === 3 && (card.suit === SUITS.SPADE || card.suit === SUITS.CLUB)
}

// 判断是否是红桃5（首家）
function isHeartFive(card) {
  return card.rank === 5 && card.suit === SUITS.HEART
}

// 判断是否是王
function isJoker(card) {
  return card.suit === SUITS.JOKER
}

// 判断是否是大王
function isBigJoker(card) {
  return card.rank === 15 && card.suit === SUITS.JOKER
}

// 判断是否是小王
function isSmallJoker(card) {
  return card.rank === 14 && card.suit === SUITS.JOKER
}

// ==================== 牌组相关函数 ====================

// 创建一张牌
function createCard(suit, rank) {
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    value: getRankValue({ suit, rank }),
    display: RANK_DISPLAY[rank] || rank.toString()
  }
}

// 创建完整牌组（去除4个6）
function createDeck() {
  const deck = []
  const suits = [SUITS.HEART, SUITS.DIAMOND, SUITS.SPADE, SUITS.CLUB]
  const ranks = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13] // 不包含6

  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(createCard(suit, rank))
    })
  })

  // 添加大小王
  deck.push(createCard(SUITS.JOKER, 14)) // 小王
  deck.push(createCard(SUITS.JOKER, 15)) // 大王

  return deck // 共50张牌
}

// 洗牌（Fisher-Yates算法）
function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 发牌（5人，每人10张）
function dealCards() {
  const deck = shuffleDeck(createDeck())
  const hands = [[], [], [], [], []]

  for (let i = 0; i < 50; i++) {
    hands[i % 5].push(deck[i])
  }

  // 对每个玩家的手牌排序
  hands.forEach(hand => {
    hand.sort((a, b) => b.value - a.value)
  })

  return hands
}

// ==================== 牌型判断函数 ====================

// 计算多张牌组合的value
// 特殊规则：红3和黑3混合时，红3失去优势，整体按黑3（普通3）计算
function getMixedCardsValue(cards) {
  if (cards[0].rank === 3) {
    const hasRedThree = cards.some(c => isRedThree(c))
    const hasBlackThree = cards.some(c => !isRedThree(c) && c.rank === 3)

    // 红3和黑3混合，按黑3的value计算（96），小于4（97）
    if (hasRedThree && hasBlackThree) {
      return 96 // 黑3的value
    }
  }

  // 其他情况，取最小value（保守计算）
  return Math.min(...cards.map(c => c.value))
}

// 判断牌型
function getCardType(cards) {
  if (!cards || cards.length === 0) return { type: CARD_TYPES.INVALID, value: 0 }

  const len = cards.length

  // 单张
  if (len === 1) {
    return { type: CARD_TYPES.SINGLE, value: cards[0].value }
  }

  // 两张牌
  if (len === 2) {
    // 双王炸弹
    if (isJoker(cards[0]) && isJoker(cards[1])) {
      return { type: CARD_TYPES.BOMB_JOKER, value: 1000 }
    }

    // 双红3炸弹（两张都是红3才是炸弹）
    if (isRedThree(cards[0]) && isRedThree(cards[1])) {
      return { type: CARD_TYPES.BOMB_RED3, value: 999 }
    }

    // 对子（同点数）
    if (cards[0].rank === cards[1].rank) {
      return { type: CARD_TYPES.PAIR, value: getMixedCardsValue(cards) }
    }

    return { type: CARD_TYPES.INVALID, value: 0 }
  }

  // 三张炸弹
  if (len === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return { type: CARD_TYPES.BOMB_THREE, value: getMixedCardsValue(cards) + 500 }
    }
    return { type: CARD_TYPES.INVALID, value: 0 }
  }

  // 四张炸弹
  if (len === 4) {
    if (cards[0].rank === cards[1].rank &&
        cards[1].rank === cards[2].rank &&
        cards[2].rank === cards[3].rank) {
      return { type: CARD_TYPES.BOMB_FOUR, value: getMixedCardsValue(cards) + 600 }
    }
    return { type: CARD_TYPES.INVALID, value: 0 }
  }

  return { type: CARD_TYPES.INVALID, value: 0 }
}

// 判断是否可以出牌（管上家）
function canBeat(myCards, lastCards) {
  // 如果没有上家牌或者上家pass，可以自由出牌
  if (!lastCards || lastCards.length === 0) {
    return getCardType(myCards).type !== CARD_TYPES.INVALID
  }

  const myType = getCardType(myCards)
  const lastType = getCardType(lastCards)

  // 无效牌型不能出
  if (myType.type === CARD_TYPES.INVALID) return false

  // 炸弹可以管任何牌
  const bombTypes = [CARD_TYPES.BOMB_THREE, CARD_TYPES.BOMB_FOUR, CARD_TYPES.BOMB_RED3, CARD_TYPES.BOMB_JOKER]

  if (bombTypes.includes(myType.type)) {
    if (!bombTypes.includes(lastType.type)) {
      // 我出炸弹，对方不是炸弹，可以管
      return true
    }
    // 双方都是炸弹，比大小
    return myType.value > lastType.value
  }

  // 对方出炸弹，我不是炸弹，不能管
  if (bombTypes.includes(lastType.type)) {
    return false
  }

  // 相同牌型比大小
  if (myType.type === lastType.type) {
    return myType.value > lastType.value
  }

  return false
}

// 判断是否包含红桃5（首家必须出含红桃5的牌）
function containsHeartFive(cards) {
  return cards.some(card => card.rank === 5 && card.suit === SUITS.HEART)
}

// ==================== 队伍相关函数 ====================

// 找到持有红桃5的玩家
function findHeartFivePlayer(hands) {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(card => isHeartFive(card))) {
      return i
    }
  }
  return 0
}

// 判断玩家阵营（红三方 or 黑三方）
function getPlayerTeam(hand) {
  const hasRedThree = hand.some(card => isRedThree(card))
  return hasRedThree ? 'red' : 'other'
}

// 获取所有玩家阵营
function getAllPlayerTeams(hands) {
  return hands.map(hand => getPlayerTeam(hand))
}

// 确定队伍，并返回红桃3和方片3玩家索引
function determineTeams(hands) {
  const teams = ['other', 'other', 'other', 'other', 'other']
  let heartThreePlayer = -1
  let diamondThreePlayer = -1

  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(card => isRedThree(card))) {
      teams[i] = 'red'
    }
    if (hands[i].some(card => isHeartThree(card))) {
      heartThreePlayer = i
    }
    if (hands[i].some(card => isDiamondThree(card))) {
      diamondThreePlayer = i
    }
  }

  return { teams, heartThreePlayer, diamondThreePlayer }
}

// ==================== 积分相关函数 ====================

// 计算亮牌基础积分
// 规则：方片3必须亮（基础分1），红桃3亮+2，黑3亮+1
function calculateBaseScore(revealedCards) {
  let baseScore = 1 // 方片3必须亮，基础分就是1

  // revealedCards 可以是二维数组 [[card, card], [card], ...] 或一维数组 [card, card, ...]
  const flatCards = Array.isArray(revealedCards[0])
    ? revealedCards.flat()
    : revealedCards

  flatCards.forEach(card => {
    if (isHeartThree(card)) {
      baseScore += 2 // 红桃3亮出+2
    } else if (isBlackThree(card)) {
      baseScore += 1 // 黑3亮出+1
    }
    // 方片3必须亮出，但不额外加分（已包含在基础分1中）
  })

  return baseScore
}

// 计算附加积分（输方手中有牌的玩家数）
// 统一规则：附加分 = 输方还有牌的玩家数
function calculateBonusScore(teams, finishedPlayers, hands, winnerTeam) {
  let bonusScore = 0

  for (let i = 0; i < 5; i++) {
    const isLoserTeam = teams[i] !== winnerTeam
    const hasCards = !finishedPlayers.includes(i) && hands[i] && hands[i].length > 0

    if (isLoserTeam && hasCards) {
      bonusScore += 1
    }
  }

  return bonusScore
}

// 计算各玩家积分变化
// 规则：红桃3玩家积分翻倍
function calculateScoreChanges(teams, heartThreePlayer, winnerTeam, finalBaseScore) {
  const changes = []

  for (let i = 0; i < 5; i++) {
    const isWinner = teams[i] === winnerTeam
    const isHeartThreePlayer = i === heartThreePlayer

    let scoreChange = finalBaseScore

    // 红桃3玩家积分翻倍
    if (isHeartThreePlayer) {
      scoreChange *= 2
    }

    // 输家扣分
    if (!isWinner) {
      scoreChange = -scoreChange
    }

    changes.push(scoreChange)
  }

  return changes
}

// 完整的积分计算
function calculateFullScores(gameState, winnerTeam) {
  const { teams, heartThreePlayer, baseScore, finishedPlayers, hands } = gameState

  // 计算附加分
  const bonusScore = calculateBonusScore(teams, finishedPlayers, hands, winnerTeam)

  // 最终基础分
  const finalBaseScore = baseScore + bonusScore

  // 计算各玩家积分变化
  const scoreChanges = calculateScoreChanges(teams, heartThreePlayer, winnerTeam, finalBaseScore)

  return {
    bonusScore,
    finalBaseScore,
    scoreChanges
  }
}

// ==================== 出牌提示函数 ====================

// 找出所有可以出的单张
function findValidSingles(hand, lastCards = null) {
  const validPlays = []

  hand.forEach(card => {
    const play = [card]
    if (!lastCards || lastCards.length === 0 || canBeat(play, lastCards)) {
      validPlays.push(play)
    }
  })

  return validPlays
}

// 找出所有可以出的对子
function findValidPairs(hand, lastCards = null) {
  const validPlays = []
  const rankGroups = {}

  // 按点数分组
  hand.forEach(card => {
    const key = card.rank
    if (!rankGroups[key]) rankGroups[key] = []
    rankGroups[key].push(card)
  })

  // 找出对子
  Object.values(rankGroups).forEach(group => {
    if (group.length >= 2) {
      const play = group.slice(0, 2)
      if (!lastCards || lastCards.length === 0 || canBeat(play, lastCards)) {
        validPlays.push(play)
      }
    }
  })

  return validPlays
}

// 找出所有可以出的炸弹
function findValidBombs(hand, lastCards = null) {
  const validPlays = []
  const rankGroups = {}

  // 按点数分组
  hand.forEach(card => {
    const key = card.rank
    if (!rankGroups[key]) rankGroups[key] = []
    rankGroups[key].push(card)
  })

  // 找三张炸弹
  Object.values(rankGroups).forEach(group => {
    if (group.length >= 3) {
      const play = group.slice(0, 3)
      if (!lastCards || lastCards.length === 0 || canBeat(play, lastCards)) {
        validPlays.push(play)
      }
    }
  })

  // 找四张炸弹
  Object.values(rankGroups).forEach(group => {
    if (group.length === 4) {
      const play = group.slice(0, 4)
      if (!lastCards || lastCards.length === 0 || canBeat(play, lastCards)) {
        validPlays.push(play)
      }
    }
  })

  // 双红3炸弹
  const redThrees = hand.filter(c => isRedThree(c))
  if (redThrees.length === 2) {
    if (!lastCards || lastCards.length === 0 || canBeat(redThrees, lastCards)) {
      validPlays.push(redThrees)
    }
  }

  // 双王炸弹
  const jokers = hand.filter(c => isJoker(c))
  if (jokers.length === 2) {
    if (!lastCards || lastCards.length === 0 || canBeat(jokers, lastCards)) {
      validPlays.push(jokers)
    }
  }

  return validPlays
}

// 找出所有可以出的牌
function findAllValidPlays(hand, lastCards = null, mustContainHeartFive = false) {
  let allPlays = [
    ...findValidSingles(hand, lastCards),
    ...findValidPairs(hand, lastCards),
    ...findValidBombs(hand, lastCards)
  ]

  // 如果必须包含红桃5
  if (mustContainHeartFive) {
    allPlays = allPlays.filter(play => containsHeartFive(play))
  }

  return allPlays
}

// ==================== 导出 ====================

// 使用 CommonJS 和 ES Module 兼容的导出方式
const GameCore = {
  // 常量
  SUITS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  RANK_DISPLAY,
  CARD_TYPES,

  // 牌判断函数
  getRankValue,
  isRedThree,
  isHeartThree,
  isDiamondThree,
  isBlackThree,
  isHeartFive,
  isJoker,
  isBigJoker,
  isSmallJoker,

  // 牌组相关函数
  createCard,
  createDeck,
  shuffleDeck,
  dealCards,

  // 牌型判断函数
  getMixedCardsValue,
  getCardType,
  canBeat,
  containsHeartFive,

  // 队伍相关函数
  findHeartFivePlayer,
  getPlayerTeam,
  getAllPlayerTeams,
  determineTeams,

  // 积分相关函数
  calculateBaseScore,
  calculateBonusScore,
  calculateScoreChanges,
  calculateFullScores,

  // 出牌提示函数
  findValidSingles,
  findValidPairs,
  findValidBombs,
  findAllValidPlays
}

// CommonJS 导出（用于 Node.js 服务器）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameCore
}

// ES Module 导出（用于前端）
export {
  SUITS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  RANK_DISPLAY,
  CARD_TYPES,
  getRankValue,
  isRedThree,
  isHeartThree,
  isDiamondThree,
  isBlackThree,
  isHeartFive,
  isJoker,
  isBigJoker,
  isSmallJoker,
  createCard,
  createDeck,
  shuffleDeck,
  dealCards,
  getMixedCardsValue,
  getCardType,
  canBeat,
  containsHeartFive,
  findHeartFivePlayer,
  getPlayerTeam,
  getAllPlayerTeams,
  determineTeams,
  calculateBaseScore,
  calculateBonusScore,
  calculateScoreChanges,
  calculateFullScores,
  findValidSingles,
  findValidPairs,
  findValidBombs,
  findAllValidPlays
}

export default GameCore
