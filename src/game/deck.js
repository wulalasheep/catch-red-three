/**
 * 牌组相关 - 从共享模块重新导出
 */
export {
  // 常量
  SUITS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  RANK_DISPLAY,

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
  dealCards
} from '../../shared/game-core.js'
