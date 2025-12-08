import React from 'react'
import { motion } from 'framer-motion'

const OrientationPrompt = () => {
  return (
    <div className="orientation-prompt">
      <motion.div 
        className="orientation-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div 
          className="phone-icon"
          animate={{ rotate: 90 }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        >
          📱
        </motion.div>
        <h2>请横屏游玩</h2>
        <p>旋转您的手机以获得最佳体验</p>
      </motion.div>
    </div>
  )
}

export default OrientationPrompt

