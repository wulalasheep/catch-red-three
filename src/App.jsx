import React, { useState, useEffect } from 'react'
import GameBoard from './components/GameBoard'
import OrientationPrompt from './components/OrientationPrompt'
import MultiplayerLobby from './components/MultiplayerLobby'
import { motion, AnimatePresence } from 'framer-motion'

// 游戏模式
const GAME_MODE = {
  SELECT: 'select',      // 选择模式
  SINGLE: 'single',      // 单人模式
  MULTIPLAYER: 'multiplayer'  // 多人模式
}

function App() {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [gameMode, setGameMode] = useState(GAME_MODE.SELECT)
  
  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const mobile = width <= 1024 && 'ontouchstart' in window
      setIsMobile(mobile)
      setIsPortrait(mobile && height > width)
    }
    
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])
  
  // 模式选择界面
  const renderModeSelect = () => (
    <motion.div 
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <h1 className="game-title">
          <span className="red">♥</span>
          <span className="black">♠</span>
          {' 捉红3 '}
          <span className="red">♦</span>
          <span className="black">♣</span>
        </h1>
        <p className="game-subtitle">五人在线纸牌游戏</p>
      </div>
      
      <div className="mode-select">
        <button 
          className="mode-btn"
          onClick={() => setGameMode(GAME_MODE.SINGLE)}
        >
          <span className="icon">🤖</span>
          <div className="text">
            <h4>单人模式</h4>
            <p>与4个电脑对战</p>
          </div>
        </button>
        
        <button 
          className="mode-btn"
          onClick={() => setGameMode(GAME_MODE.MULTIPLAYER)}
        >
          <span className="icon">👥</span>
          <div className="text">
            <h4>多人模式</h4>
            <p>创建或加入房间，与真人玩家对战</p>
          </div>
        </button>
      </div>
      
      <div className="game-rules-brief">
        <h3>游戏简介</h3>
        <ul>
          <li>5人参与，每人10张牌</li>
          <li>红桃3、方片3持有者为红三方</li>
          <li>持红桃5者首家出牌</li>
          <li>先出完牌的一方获胜</li>
        </ul>
      </div>
    </motion.div>
  )
  
  return (
    <div className="app">
      {isPortrait && <OrientationPrompt />}
      
      <AnimatePresence mode="wait">
        {gameMode === GAME_MODE.SELECT && (
          <motion.div 
            key="select"
            className="game-board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-decoration">
              <div className="bg-pattern"></div>
            </div>
            {renderModeSelect()}
          </motion.div>
        )}
        
        {gameMode === GAME_MODE.SINGLE && (
          <motion.div 
            key="single"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameBoard onBack={() => setGameMode(GAME_MODE.SELECT)} />
          </motion.div>
        )}
        
        {gameMode === GAME_MODE.MULTIPLAYER && (
          <motion.div 
            key="multiplayer"
            style={{ width: '100%', height: '100%', minHeight: '100vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MultiplayerLobby 
              onStartSinglePlayer={() => setGameMode(GAME_MODE.SINGLE)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App

