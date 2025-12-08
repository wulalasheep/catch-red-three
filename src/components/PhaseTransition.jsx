import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GAME_PHASES } from '../hooks/useGame'

const PhaseTransition = ({ phase, isVisible, message, icon, subtitle }) => {
  const getPhaseConfig = (phase) => {
    switch (phase) {
      case GAME_PHASES.DEALING:
        return {
          icon: '🃏',
          title: '发牌中',
          subtitle: '正在为所有玩家发牌...',
          color: '#3498db'
        }
      case GAME_PHASES.REVEALING:
        return {
          icon: '👁️',
          title: '亮牌阶段',
          subtitle: '请选择要亮的牌',
          color: '#e74c3c'
        }
      case GAME_PHASES.PLAYING:
        return {
          icon: '🎮',
          title: '开始游戏',
          subtitle: '游戏即将开始',
          color: '#2ecc71'
        }
      case GAME_PHASES.ROUND_END:
        return {
          icon: '🏆',
          title: '回合结束',
          subtitle: '计算积分中...',
          color: '#f39c12'
        }
      case GAME_PHASES.GAME_OVER:
        return {
          icon: '🎉',
          title: '游戏结束',
          subtitle: '准备查看结果',
          color: '#9b59b6'
        }
      default:
        return {
          icon: '⏳',
          title: '加载中',
          subtitle: '请稍候...',
          color: '#95a5a6'
        }
    }
  }

  const config = getPhaseConfig(phase)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="phase-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="phase-transition-content"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: 0.1
            }}
          >
            <motion.div
              className="phase-transition-icon"
              style={{ color: config.color }}
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1, 1.05]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {config.icon}
            </motion.div>

            <motion.h2
              className="phase-transition-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {config.title}
            </motion.h2>

            <motion.p
              className="phase-transition-subtitle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {config.subtitle}
            </motion.p>

            <motion.div
              className="phase-loading-dots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span></span>
              <span></span>
              <span></span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PhaseTransition


