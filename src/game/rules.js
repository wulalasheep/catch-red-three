/**
 * 游戏规则相关 - 从共享模块重新导出
 */
export {
  // 牌型枚举
  CARD_TYPES,

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
} from '../../shared/game-core.js'

// 为了兼容性，也从 deck.js 重新导出一些常用函数
export { SUITS, isRedThree, isJoker } from './deck.js'
