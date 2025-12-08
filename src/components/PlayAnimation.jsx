import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './Card'

const PlayAnimation = ({
  cards,
  playerId,
  fromPosition,
  toPosition,
  onComplete,
  delay = 0
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedCards, setCompletedCards] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    if (!cards || cards.length === 0) {
      onComplete && onComplete()
      return
    }

    // 计算每张牌的延迟时间
    const animationDelay = 150 // 每张牌间隔150ms

    cards.forEach((card, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1)
      }, index * animationDelay)
    })

    // 总动画时间
    const totalDuration = cards.length * animationDelay + 800 // 800ms是单张牌的飞行时间
    setTimeout(() => {
      onComplete && onComplete()
    }, totalDuration)

  }, [cards, onComplete])

  if (!cards || cards.length === 0) return null

  return (
    <div ref={containerRef} className="play-animation-container">
      <AnimatePresence>
        {cards.map((card, index) => {
          const isActive = index < currentStep
          const animationDelay = index * 0.15 // 每张牌延迟0.15秒

          if (!isActive) return null

          return (
            <motion.div
              key={`play-${card.id}-${playerId}`}
              className="animated-card"
              initial={{
                x: fromPosition.x,
                y: fromPosition.y,
                scale: 1,
                rotate: 0
              }}
              animate={{
                x: [fromPosition.x, fromPosition.x + (toPosition.x - fromPosition.x) * 0.3, fromPosition.x + (toPosition.x - fromPosition.x) * 0.7, toPosition.x],
                y: [fromPosition.y, Math.min(fromPosition.y, toPosition.y) - 80, Math.min(fromPosition.y, toPosition.y) - 60, toPosition.y],
                scale: [1, 1.1, 1.05, 1],
                rotate: [0, 5, -3, 0]
              }}
              transition={{
                duration: 0.8,
                delay: animationDelay,
                ease: [0.25, 0.46, 0.45, 0.94],
                times: [0, 0.3, 0.7, 1]
              }}
              onAnimationComplete={() => {
                setCompletedCards(prev => [...prev, card.id])
              }}
            >
              <Card
                card={card}
                size="normal"
                disabled={true}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default PlayAnimation


