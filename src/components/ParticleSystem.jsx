import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ParticleSystem = ({
  particles = [],
  onComplete = null,
  className = ''
}) => {
  return (
    <div className={`particle-system ${className}`}>
      <AnimatePresence>
        {particles.map((particle, index) => (
          <motion.div
            key={`${particle.id}-${index}`}
            className={`particle particle-${particle.type}`}
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              ...particle.style
            }}
            initial={{
              opacity: 0,
              scale: 0,
              x: 0,
              y: 0,
              rotate: 0
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
              x: particle.endX || 0,
              y: particle.endY || 0,
              rotate: particle.rotation || 360
            }}
            transition={{
              duration: particle.duration || 2,
              ease: particle.ease || [0.25, 0.46, 0.45, 0.94],
              times: [0, 0.1, 0.9, 1]
            }}
            onAnimationComplete={() => {
              if (index === particles.length - 1 && onComplete) {
                onComplete()
              }
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ParticleSystem


