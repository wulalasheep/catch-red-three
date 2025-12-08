import { useCallback, useRef } from 'react'

// 交互反馈管理
export const useInteractionFeedback = () => {
  const audioContextRef = useRef(null)

  // 初始化音频上下文
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && window.AudioContext) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
  }, [])

  // 播放音效
  const playSound = useCallback((frequency, duration = 200, type = 'sine') => {
    if (!audioContextRef.current) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000)
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }, [])

  // 振动反馈
  const vibrate = useCallback((pattern = [50]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  // 不同类型的反馈
  const feedback = {
    // 轻触反馈
    tap: useCallback(() => {
      initAudioContext()
      playSound(800, 50, 'sine')
      vibrate([20])
    }, [initAudioContext, playSound, vibrate]),

    // 出牌反馈
    play: useCallback(() => {
      initAudioContext()
      playSound(600, 150, 'triangle')
      vibrate([30, 20, 30])
    }, [initAudioContext, playSound, vibrate]),

    // 成功反馈
    success: useCallback(() => {
      initAudioContext()
      playSound(800, 200, 'sine')
      setTimeout(() => playSound(1000, 200, 'sine'), 100)
      vibrate([50, 50, 50])
    }, [initAudioContext, playSound, vibrate]),

    // 错误反馈
    error: useCallback(() => {
      initAudioContext()
      playSound(300, 300, 'sawtooth')
      vibrate([100, 50, 100])
    }, [initAudioContext, playSound, vibrate]),

    // 亮牌反馈
    reveal: useCallback(() => {
      initAudioContext()
      playSound(1200, 100, 'sine')
      vibrate([25, 25, 25])
    }, [initAudioContext, playSound, vibrate]),

    // 禁用操作反馈
    disabled: useCallback(() => {
      initAudioContext()
      playSound(200, 100, 'square')
      vibrate([10])
    }, [initAudioContext, playSound, vibrate])
  }

  return feedback
}


