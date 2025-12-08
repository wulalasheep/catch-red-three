import React from 'react'
import { motion } from 'framer-motion'
import Hand from './Hand'
import { SUIT_SYMBOLS, SUIT_COLORS } from '../game/deck'

const Player = ({
  player,
  position,
  isCurrentTurn,
  cards,
  lastPlay,
  revealedCards = [],
  score = 100,
  team,
  isUser = false,
  selectedCards = [],
  onCardClick,
  onDragSelect = null,
  disabled = false,
  handRef = null
}) => {
  const positionClasses = {
    bottom: 'player-bottom',
    top: 'player-top',
    left: 'player-left',
    right: 'player-right',
    'top-left': 'player-top-left',
    'top-right': 'player-top-right'
  }

  const avatars = ['🎮', '🎯', '🎲', '🎰', '🃏']

  // 判断亮牌信息展示位置
  const isVertical = position === 'left' || position === 'right'
  const isTopOrBottom = position === 'bottom' || position === 'top' || position === 'top-left' || position === 'top-right'
  const isTopPosition = position === 'top-left' || position === 'top-right'

  // 渲染亮牌信息图标
  const renderRevealedCardsIcons = () => {
    if (!revealedCards || revealedCards.length === 0) return null

    return (
      <div className={`revealed-cards-icons ${isVertical ? 'vertical' : 'horizontal'}`}>
        {revealedCards.map((card, index) => (
          <div
            key={card.id || index}
            className="revealed-card-icon"
            style={{
              color: SUIT_COLORS[card.suit] || '#2c3e50'
            }}
          >
            <span className="icon-suit">{SUIT_SYMBOLS[card.suit] || '♠'}</span>
            <span className="icon-rank">{card.display}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`player ${positionClasses[position]} ${isCurrentTurn ? 'player-active' : ''} ${team === 'red' ? 'player-red-team' : ''}`}>
      {/* 玩家信息 - 固定宽度容器 */}
      <div className={`player-info-wrapper ${isTopPosition ? 'info-wrapper-top' : ''}`}>
        <div
          className={`player-info ${isCurrentTurn ? 'player-info-active' : ''}`}
        >
          <div className="player-avatar">
            {avatars[player.id % avatars.length]}
          </div>
          <div className="player-details">
            <div className="player-name-row">
              <span className="player-name">{player.name}</span>
            </div>
            <div className="player-score">
              <span className="score-icon">💰</span>
              <span className={score >= 100 ? 'score-positive' : 'score-negative'}>{score}</span>
            </div>
          </div>
        </div>
        {/* 出牌状态 - 上方玩家放右侧，其他玩家放下方 */}
        {isCurrentTurn && (
          <motion.div
            className={`turn-indicator-float ${isTopPosition ? 'turn-indicator-side' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            出牌中...
          </motion.div>
        )}
      </div>

      {/* 手牌区域 - 包含亮牌信息 */}
      <div className={`hand-area ${isVertical ? 'hand-area-vertical' : 'hand-area-horizontal'}`}>
        {/* 左右玩家：亮牌信息在手牌上方 */}
        {isVertical && renderRevealedCardsIcons()}

        <div className="hand-with-reveal">
          {/* 上下玩家：亮牌信息在手牌左侧 */}
          {isTopOrBottom && renderRevealedCardsIcons()}

          <div ref={handRef}>
            <Hand
              cards={cards}
              selectedCards={selectedCards}
              onCardClick={onCardClick}
              onDragSelect={isUser ? onDragSelect : null}
              disabled={disabled || !isUser}
              faceDown={!isUser}
              position={position}
              revealedCards={revealedCards}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Player

