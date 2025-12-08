import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useInteractionFeedback } from '../hooks/useInteractionFeedback'

const EnhancedButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'normal',
  className = '',
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const feedback = useInteractionFeedback()

  const handleClick = useCallback((e) => {
    if (disabled || loading) {
      feedback.disabled()
      return
    }

    feedback.tap()
    setIsPressed(true)

    if (onClick) {
      onClick(e)
    }

    // 重置按下状态
    setTimeout(() => setIsPressed(false), 150)
  }, [disabled, loading, onClick, feedback])

  const baseClasses = `btn btn-${variant} ${size !== 'normal' ? `btn-${size}` : ''} ${className}`.trim()
  const stateClasses = [
    disabled ? 'btn-disabled' : '',
    loading ? 'btn-loading' : '',
    isPressed ? 'btn-pressed' : ''
  ].filter(Boolean).join(' ')

  const finalClassName = `${baseClasses} ${stateClasses}`.trim()

  return (
    <motion.button
      className={finalClassName}
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? {
        scale: 1.02,
        transition: { duration: 0.2 }
      } : {}}
      whileTap={!disabled && !loading ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default EnhancedButton


