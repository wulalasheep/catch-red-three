import { findAllValidPlays, containsHeartFive, getCardType, CARD_TYPES, canBeat } from './rules'
import { isRedThree, isBlackThree, isDiamondThree } from './deck'

// AI难度级别
export const AI_LEVELS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard'
}

// AI决定是否亮牌
export const aiDecideReveal = (hand, level = AI_LEVELS.NORMAL) => {
  const revealCards = []
  
  hand.forEach(card => {
    // 方片3必须亮出
    if (isDiamondThree(card)) {
      revealCards.push(card)
    }
    // 红桃3可选，AI根据难度决定
    else if (isRedThree(card)) {
      if (level === AI_LEVELS.HARD) {
        // 困难AI会分析手牌强度决定
        const handStrength = calculateHandStrength(hand)
        if (handStrength > 0.6) {
          revealCards.push(card)
        }
      } else if (level === AI_LEVELS.NORMAL && Math.random() > 0.5) {
        revealCards.push(card)
      }
    }
    // 黑3可选
    else if (isBlackThree(card)) {
      if (level === AI_LEVELS.HARD) {
        // 困难AI只在手牌强时亮黑3
        const handStrength = calculateHandStrength(hand)
        if (handStrength > 0.7) {
          revealCards.push(card)
        }
      } else if (level === AI_LEVELS.NORMAL && Math.random() > 0.7) {
        revealCards.push(card)
      }
    }
  })
  
  return revealCards
}

// 计算手牌强度（0-1）
const calculateHandStrength = (hand) => {
  let strength = 0
  
  hand.forEach(card => {
    if (card.value >= 98) strength += 0.15 // 红3/大小王
    else if (card.value >= 95) strength += 0.1 // 4/黑3/2
    else if (card.value >= 90) strength += 0.05 // A-10
    else strength += 0.02
  })
  
  // 检查炸弹
  const rankCounts = {}
  hand.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1
  })
  
  Object.values(rankCounts).forEach(count => {
    if (count === 4) strength += 0.3
    else if (count === 3) strength += 0.2
    else if (count === 2) strength += 0.05
  })
  
  return Math.min(1, strength)
}

// AI选择出牌
export const aiSelectPlay = (hand, lastCards, mustContainHeartFive = false, level = AI_LEVELS.NORMAL) => {
  // 获取所有可能的出牌
  let validPlays = findAllValidPlays(hand, lastCards, mustContainHeartFive)
  
  // 如果有上家牌，二次过滤确保真的能管住
  if (lastCards && lastCards.length > 0) {
    validPlays = validPlays.filter(play => canBeat(play, lastCards))
  }
  
  if (validPlays.length === 0) {
    return null // 要不起
  }
  
  // 简单AI：随机出牌
  if (level === AI_LEVELS.EASY) {
    return validPlays[Math.floor(Math.random() * validPlays.length)]
  }
  
  // 普通AI：优先出小牌
  if (level === AI_LEVELS.NORMAL) {
    return selectNormalPlay(validPlays, hand, lastCards)
  }
  
  // 困难AI：更策略性的出牌
  return selectHardPlay(validPlays, hand, lastCards)
}

// 普通AI出牌策略
const selectNormalPlay = (validPlays, hand, lastCards) => {
  // 如果是主动出牌，优先出单张小牌
  if (!lastCards || lastCards.length === 0) {
    // 找最小的单张
    const singles = validPlays.filter(p => p.length === 1)
    if (singles.length > 0) {
      return singles[singles.length - 1] // 最小的单张
    }
    // 找最小的对子
    const pairs = validPlays.filter(p => p.length === 2)
    if (pairs.length > 0) {
      return pairs[pairs.length - 1]
    }
    return validPlays[validPlays.length - 1]
  }
  
  // 被动出牌，出刚好能管住的牌
  const lastType = getCardType(lastCards)
  const sameTypePlays = validPlays.filter(p => {
    const myType = getCardType(p)
    return myType.type === lastType.type
  })
  
  if (sameTypePlays.length > 0) {
    // 出最小的能管住的牌
    return sameTypePlays[sameTypePlays.length - 1]
  }
  
  // 如果只有炸弹能管，50%概率出炸弹
  if (Math.random() > 0.5) {
    return validPlays[validPlays.length - 1]
  }
  
  return null // 选择不要
}

// 困难AI出牌策略
const selectHardPlay = (validPlays, hand, lastCards) => {
  // 如果只剩少量牌，积极出牌
  if (hand.length <= 3) {
    return validPlays[0] // 出最大的
  }
  
  // 主动出牌
  if (!lastCards || lastCards.length === 0) {
    // 如果有炸弹以外的牌，优先出小牌
    const nonBombs = validPlays.filter(p => {
      const type = getCardType(p)
      return ![CARD_TYPES.BOMB_THREE, CARD_TYPES.BOMB_FOUR, CARD_TYPES.BOMB_RED3, CARD_TYPES.BOMB_JOKER].includes(type.type)
    })
    
    if (nonBombs.length > 0) {
      return nonBombs[nonBombs.length - 1]
    }
    return validPlays[validPlays.length - 1]
  }
  
  // 被动出牌，尽量保留炸弹
  const lastType = getCardType(lastCards)
  const sameTypePlays = validPlays.filter(p => {
    const myType = getCardType(p)
    return myType.type === lastType.type
  })
  
  if (sameTypePlays.length > 0) {
    return sameTypePlays[sameTypePlays.length - 1]
  }
  
  // 评估是否值得出炸弹
  const bombPlays = validPlays.filter(p => {
    const type = getCardType(p)
    return [CARD_TYPES.BOMB_THREE, CARD_TYPES.BOMB_FOUR, CARD_TYPES.BOMB_RED3, CARD_TYPES.BOMB_JOKER].includes(type.type)
  })
  
  if (bombPlays.length > 0 && hand.length <= 5) {
    return bombPlays[bombPlays.length - 1] // 出最小的炸弹
  }
  
  return null // 选择不要
}

// AI延迟时间（模拟思考）
export const getAIDelay = (level = AI_LEVELS.NORMAL) => {
  switch (level) {
    case AI_LEVELS.EASY:
      return 500 + Math.random() * 500
    case AI_LEVELS.NORMAL:
      return 800 + Math.random() * 700
    case AI_LEVELS.HARD:
      return 1000 + Math.random() * 1000
    default:
      return 800
  }
}

