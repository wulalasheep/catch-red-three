import { useState, useCallback } from 'react'

// 粒子效果管理
export const useParticleEffects = () => {
  const [particles, setParticles] = useState([])

  // 生成随机粒子
  const generateParticles = useCallback((count, centerX, centerY, options = {}) => {
    const {
      type = 'spark',
      color = '#f1c40f',
      size = 4,
      spread = 100,
      duration = 1.5,
      speed = 1
    } = options

    const newParticles = []

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const distance = Math.random() * spread + 20
      const velocity = (Math.random() * 0.5 + 0.5) * speed

      newParticles.push({
        id: `particle-${Date.now()}-${i}`,
        type,
        x: centerX,
        y: centerY,
        endX: Math.cos(angle) * distance * velocity,
        endY: Math.sin(angle) * distance * velocity,
        size: size + Math.random() * size * 0.5,
        color,
        duration: duration + Math.random() * 0.5,
        rotation: Math.random() * 360,
        style: type === 'star' ? {
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        } : type === 'heart' ? {
          clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)'
        } : {}
      })
    }

    return newParticles
  }, [])

  // 触发粒子效果
  const triggerParticles = useCallback((effectType, centerX, centerY) => {
    let particleConfig = {}

    switch (effectType) {
      case 'playCard':
        particleConfig = {
          count: 8,
          type: 'spark',
          color: '#e74c3c',
          size: 3,
          spread: 60,
          duration: 1
        }
        break

      case 'win':
        particleConfig = {
          count: 20,
          type: 'star',
          color: '#f1c40f',
          size: 6,
          spread: 150,
          duration: 2,
          speed: 1.5
        }
        break

      case 'reveal':
        particleConfig = {
          count: 12,
          type: 'spark',
          color: '#3498db',
          size: 4,
          spread: 80,
          duration: 1.2
        }
        break

      case 'success':
        particleConfig = {
          count: 15,
          type: 'heart',
          color: '#2ecc71',
          size: 5,
          spread: 120,
          duration: 1.8
        }
        break

      default:
        particleConfig = {
          count: 6,
          type: 'spark',
          color: '#95a5a6',
          size: 3,
          spread: 40,
          duration: 1
        }
    }

    const newParticles = generateParticles(
      particleConfig.count,
      centerX,
      centerY,
      particleConfig
    )

    setParticles(prev => [...prev, ...newParticles])

    // 清理完成的粒子
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)))
    }, (particleConfig.duration + 0.5) * 1000)

  }, [generateParticles])

  // 清除所有粒子
  const clearParticles = useCallback(() => {
    setParticles([])
  }, [])

  return {
    particles,
    triggerParticles,
    clearParticles
  }
}


