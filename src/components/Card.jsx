import React, { useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { SUIT_SYMBOLS, SUIT_COLORS, SUITS } from '../game/deck'

const Card = ({
  card,
  selected = false,
  onClick,
  disabled = false,
  faceDown = false,
  size = 'normal',
  revealed = false,
  style = {},
  animateToCenter = false,
  centerPosition = null,
  onAnimationComplete = null,
  delay = 0
}) => {
  if (!card) return null

  const [isAnimating, setIsAnimating] = useState(false)
  const controls = useAnimation()

  const isJoker = card.suit === SUITS.JOKER
  const isBig = card.rank === 15
  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const suitColor = isJoker ? (isBig ? '#e74c3c' : '#2c3e50') : SUIT_COLORS[card.suit]

  const sizeClasses = {
    tiny: 'card-tiny',
    small: 'card-small',
    normal: 'card-normal',
    large: 'card-large'
  }

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card)
    }
  }

  // 出牌动画效果
  useEffect(() => {
    if (animateToCenter && centerPosition) {
      setIsAnimating(true)

      // 计算抛物线轨迹
      const startX = 0
      const startY = 0
      const endX = centerPosition.x
      const endY = centerPosition.y

      // 抛物线控制点
      const midX = (startX + endX) / 2
      const midY = Math.min(startY, endY) - 80 // 抛物线最高点

      // 使用贝塞尔曲线创建抛物线效果
      controls.start({
        x: [0, midX * 0.3, midX * 0.7, endX],
        y: [0, midY * 0.5, midY * 0.8, endY],
        scale: [1, 1.1, 1.05, 1],
        rotate: [0, 5, -3, 0],
        transition: {
          duration: 0.8,
          delay: delay,
          ease: [0.25, 0.46, 0.45, 0.94], // 自定义贝塞尔曲线
          times: [0, 0.3, 0.7, 1]
        }
      }).then(() => {
        setIsAnimating(false)
        if (onAnimationComplete) {
          onAnimationComplete()
        }
      })
    }
  }, [animateToCenter, centerPosition, delay, controls, onAnimationComplete])
  
  // 牌背面
  if (faceDown) {
    return (
      <div
        className={`card card-back ${sizeClasses[size]}`}
        style={style}
      >
        <div className="card-back-pattern">
          <div className="pattern-diamond"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`card ${sizeClasses[size]} ${selected ? 'card-selected' : ''} ${disabled ? 'card-disabled' : ''} ${revealed ? 'card-revealed' : ''} ${isAnimating ? 'card-animating' : ''}`}
      onClick={handleClick}
      style={{ ...style, '--suit-color': suitColor }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={animateToCenter ? controls : {
        scale: 1,
        opacity: 1,
        y: selected ? -20 : 0,
        x: 0,
        rotate: 0
      }}
      whileHover={!disabled && !isAnimating ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isAnimating ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15 }}
    >
      {isJoker ? (
        <div className={`card-joker ${isBig ? 'joker-big' : 'joker-small'}`}>
          <div className="joker-corner joker-corner-top">
            <span className="joker-text" style={{ color: suitColor }}>J</span>
            <span className="joker-text" style={{ color: suitColor }}>O</span>
            <span className="joker-text" style={{ color: suitColor }}>K</span>
            <span className="joker-text" style={{ color: suitColor }}>E</span>
            <span className="joker-text" style={{ color: suitColor }}>R</span>
          </div>
          <div className="joker-figure">
            <div className={`joker-clown ${isBig ? 'clown-color' : 'clown-bw'}`}>
              <div className="clown-hat">◆</div>
              <div className="clown-face">☺</div>
              <div className="clown-body">♦</div>
            </div>
          </div>
          <div className="joker-corner joker-corner-bottom">
            <span className="joker-text" style={{ color: suitColor }}>J</span>
            <span className="joker-text" style={{ color: suitColor }}>O</span>
            <span className="joker-text" style={{ color: suitColor }}>K</span>
            <span className="joker-text" style={{ color: suitColor }}>E</span>
            <span className="joker-text" style={{ color: suitColor }}>R</span>
          </div>
        </div>
      ) : (
        <>
          <div className="card-corner card-corner-top">
            <span className="card-rank">{card.display}</span>
            <span className="card-suit">{suitSymbol}</span>
          </div>
          <div className="card-center">
            <span className="card-suit-large">{suitSymbol}</span>
          </div>
          <div className="card-corner card-corner-bottom">
            <span className="card-rank">{card.display}</span>
            <span className="card-suit">{suitSymbol}</span>
          </div>
        </>
      )}
      {revealed && <div className="card-revealed-badge">亮</div>}
    </motion.div>
  )
}

export default Card

