import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Player from './Player'
import Hand from './Hand'
import Card from './Card'
import PlayAnimation from './PlayAnimation'
import DragSelectOverlay from './DragSelectOverlay'
import PhaseTransition from './PhaseTransition'
import EnhancedButton from './EnhancedButton'
import ParticleSystem from './ParticleSystem'
import GameLog from './GameLog'
import GameRules from './GameRules'
import useGame, { GAME_PHASES } from '../hooks/useGame'
import { getCardType, canBeat, containsHeartFive, CARD_TYPES } from '../game/rules'
import { useInteractionFeedback } from '../hooks/useInteractionFeedback'
import { useParticleEffects } from '../hooks/useParticleEffects'

const GameBoard = () => {
  const {
    phase,
    hands,
    players,
    currentPlayer,
    lastPlay,
    lastPlays,
    selectedCards,
    revealedCards,
    teams,
    baseScore,
    revealTimer,
    winner,
    message,
    isFirstRound,
    gameLog,
    roundNumber,
    finishedPlayers,
    startGame,
    selectCard,
    playCards,
    pass,
    restart,
    toggleReveal,
    hint
  } = useGame()

  // 拖拽选择处理
  const handleDragSelect = useCallback((selectedCardIds) => {
    if (currentPlayer !== 0 || !hands[0]) return

    // 找到对应的牌对象
    const cardsToSelect = hands[0].filter(card => selectedCardIds.includes(card.id))

    if (cardsToSelect.length > 0) {
      // 对于拖拽选择，切换这些牌的选中状态
      cardsToSelect.forEach(card => {
        selectCard(card)
      })
    }
  }, [currentPlayer, hands, selectCard])

  const [showLog, setShowLog] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [playingAnimation, setPlayingAnimation] = useState(null)
  const [dragSelectRect, setDragSelectRect] = useState(null)
  const [phaseTransition, setPhaseTransition] = useState(null)
  const handRefs = useRef({})
  const centerRef = useRef(null)
  const prevPhaseRef = useRef(null)
  const feedback = useInteractionFeedback()
  const { particles, triggerParticles, clearParticles } = useParticleEffects()

  // AI玩家位置 (电脑1左侧，电脑2左上，电脑3右上，电脑4右侧 - 对称布局)
  const aiPositions = ['left', 'top-left', 'top-right', 'right']

  // 监听阶段变化，显示过渡动画
  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    let transitionTimeout

    const showTransition = (phase, duration = 2000) => {
      setPhaseTransition({ phase, visible: true })

      transitionTimeout = setTimeout(() => {
        setPhaseTransition({ phase, visible: false })
      }, duration)
    }

    // 根据不同阶段显示不同的过渡动画
    if (phase === GAME_PHASES.DEALING && prevPhase !== GAME_PHASES.DEALING) {
      showTransition(phase, 2000) // 发牌阶段显示2秒
    } else if (phase === GAME_PHASES.REVEALING && prevPhase !== GAME_PHASES.REVEALING) {
      showTransition(phase, 1000) // 亮牌阶段显示1秒
    } else if (phase === GAME_PHASES.PLAYING && prevPhase !== GAME_PHASES.PLAYING && !winner) {
      showTransition(phase, 1500) // 进入游戏阶段显示1.5秒
    } else if (phase === GAME_PHASES.ROUND_END && prevPhase !== GAME_PHASES.ROUND_END) {
      showTransition(phase, 2500) // 回合结束显示2.5秒
    }

    return () => {
      if (transitionTimeout) {
        clearTimeout(transitionTimeout)
      }
    }
  }, [phase, winner])

  // 监听胜利状态，触发粒子效果
  useEffect(() => {
    if (winner) {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      triggerParticles('win', centerX, centerY)
    }
  }, [winner, triggerParticles])

  // 获取中央出牌区域的位置
  const getCenterPosition = () => {
    if (centerRef.current) {
      const rect = centerRef.current.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  // 获取手牌位置
  const getHandPosition = (playerId) => {
    const ref = handRefs.current[playerId]
    if (ref) {
      const rect = ref.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }
    }

    // 默认位置
    const positions = {
      0: { x: window.innerWidth / 2, y: window.innerHeight - 100 },
      1: { x: 100, y: window.innerHeight / 2 },
      2: { x: window.innerWidth / 2, y: 100 },
      3: { x: window.innerWidth - 100, y: 100 },
      4: { x: window.innerWidth - 100, y: window.innerHeight / 2 }
    }
    return positions[playerId] || { x: 0, y: 0 }
  }

  // 验证所选牌是否可以出
  const isValidPlay = useCallback(() => {
    if (selectedCards.length === 0) return false

    // 检查牌型是否有效
    const cardType = getCardType(selectedCards)
    if (cardType.type === CARD_TYPES.INVALID) return false

    // 首轮必须包含红桃5
    if (isFirstRound && !containsHeartFive(selectedCards)) return false

    // 如果没有上家牌，或者上家是自己（自由出牌权），可以自由出牌
    const isFreePlay = !lastPlay || lastPlay.playerId === currentPlayer
    if (isFreePlay) return true

    // 检查是否能管住上家
    return canBeat(selectedCards, lastPlay.cards)
  }, [selectedCards, isFirstRound, lastPlay, currentPlayer])

  // 修改出牌函数，添加动画和反馈
  const handlePlayCards = () => {
    if (selectedCards.length === 0 || !isValidPlay()) return

    // 出牌反馈
    feedback.play()

    const fromPosition = getHandPosition(0)
    const toPosition = getCenterPosition()

    // 设置动画状态
    setPlayingAnimation({
      cards: selectedCards,
      playerId: 0,
      fromPosition,
      toPosition
    })

    // 触发出牌粒子效果
    const centerPos = getCenterPosition()
    triggerParticles('playCard', centerPos.x, centerPos.y)

    // 延迟执行实际出牌逻辑，让动画有时间播放
    setTimeout(() => {
      playCards()
    }, selectedCards.length * 150 + 800) // 根据动画时间调整
  }
  
  const renderStartScreen = () => (
    <motion.div 
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="game-logo">
        <span className="logo-card red">♥</span>
        <span className="logo-card black">♠</span>
        <span className="logo-text">捉红3</span>
        <span className="logo-card red">♦</span>
        <span className="logo-card black">♣</span>
      </div>
      <p className="game-subtitle">五人在线纸牌游戏</p>
      <EnhancedButton
        variant="start"
        onClick={() => {
          feedback.success()
          startGame()
        }}
        size="large"
      >
        开始游戏
      </EnhancedButton>
    </motion.div>
  )
  
  const renderRevealPhase = () => (
    <motion.div 
      className="reveal-phase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="reveal-timer">
        <div className="timer-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="timer-bg" />
            <circle 
              cx="50" cy="50" r="45" 
              className="timer-progress"
              style={{ 
                strokeDasharray: 283,
                strokeDashoffset: 283 - (283 * revealTimer / 10)
              }}
            />
          </svg>
          <span className="timer-text">{revealTimer}</span>
        </div>
        <p>亮牌倒计时</p>
      </div>
      
      <div className="reveal-info">
        <p>方片3必须亮出</p>
        <p>点击红桃3或黑3可选择亮牌</p>
        <p>红桃3亮出: 积分+2 | 黑3亮出: 积分+1</p>
      </div>
      
      <div className="reveal-hand">
        <p className="hand-label">你的手牌（点击3可亮牌）</p>
        <Hand
          cards={hands[0]}
          selectedCards={revealedCards[0]}
          onCardClick={(card) => {
            if (card.rank === 3) {
              toggleReveal(card)
            }
          }}
          disabled={false}
          position="bottom"
          revealedCards={revealedCards[0]}
        />
      </div>
    </motion.div>
  )
  
  const renderGameTable = () => (
    <div className="game-table">
      {/* 阶段过渡动画 */}
      <PhaseTransition
        phase={phaseTransition?.phase}
        isVisible={phaseTransition?.visible}
      />

      {/* 出牌动画层 */}
      {playingAnimation && (
        <PlayAnimation
          cards={playingAnimation.cards}
          playerId={playingAnimation.playerId}
          fromPosition={playingAnimation.fromPosition}
          toPosition={playingAnimation.toPosition}
          onComplete={() => {
            setPlayingAnimation(null)
            // 动画完成后显示最终的牌
          }}
        />
      )}

      {/* 拖拽选择覆盖层 */}
      <DragSelectOverlay
        selectedRect={dragSelectRect}
        isVisible={dragSelectRect !== null}
      />

      {/* 粒子效果系统 */}
      <ParticleSystem
        particles={particles}
        onComplete={clearParticles}
      />

      {/* 右上角游戏信息面板 */}
      <div className="game-status-panel">
        <div className="status-item">
          <span className="status-label">第{roundNumber}轮</span>
          <span className="status-value">基数:{baseScore}</span>
        </div>
        <div className="status-item">
          <span className="status-label">当前</span>
          <span className="status-value">{players[currentPlayer]?.name}</span>
        </div>
        {finishedPlayers.length > 0 && (
          <div className="status-item">
            <span className="status-label">已出完</span>
            <span className="status-value">
              {finishedPlayers.map(p => players[p]?.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 中央出牌区 */}
      <div className="table-center">
        <div className="center-play-area" ref={centerRef}>
          <AnimatePresence mode="wait">
            {lastPlay && !lastPlay.pass && !playingAnimation && (
              <motion.div
                className="last-play"
                key={lastPlay.playerId + '-' + lastPlay.cards.map(c => c.id).join('')}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <div className="last-play-player-name">
                  {players[lastPlay.playerId]?.name}
                </div>
                <div className="last-play-cards">
                  {lastPlay.cards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      style={{
                        marginLeft: index > 0 ? '-20px' : 0,
                        zIndex: index
                      }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 400,
                        damping: 20
                      }}
                    >
                      <Card card={card} size="normal" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* AI玩家 */}
      {[1, 2, 3, 4].map((index, i) => (
        <Player
          key={index}
          player={players[index]}
          position={aiPositions[i]}
          isCurrentTurn={currentPlayer === index}
          cards={hands[index]}
          lastPlay={lastPlays[index]}
          revealedCards={revealedCards[index]}
          score={players[index]?.score}
          team={teams[index]}
          isUser={false}
          handRef={el => handRefs.current[index] = el}
        />
      ))}

      {/* 玩家区域 */}
      <div className="player-area">
        <Player
          player={players[0]}
          position="bottom"
          isCurrentTurn={currentPlayer === 0}
          cards={hands[0]}
          lastPlay={lastPlays[0]}
          revealedCards={revealedCards[0]}
          score={players[0]?.score}
          team={teams[0]}
          isUser={true}
          selectedCards={selectedCards}
          onCardClick={selectCard}
          onDragSelect={handleDragSelect}
          disabled={currentPlayer !== 0 || playingAnimation}
          handRef={el => handRefs.current[0] = el}
        />
        
        {/* 操作按钮 */}
        <div className="action-buttons-container">
          {(finishedPlayers.includes(0) || hands[0]?.length === 0) ? (
            <div className="action-buttons">
              <span className="waiting-text">已出完</span>
            </div>
          ) : currentPlayer === 0 ? (
            <div className="action-buttons">
              <EnhancedButton
                variant="hint"
                onClick={hint}
                disabled={playingAnimation}
              >
                提示
              </EnhancedButton>
              <EnhancedButton
                variant="pass"
                onClick={pass}
                disabled={isFirstRound || playingAnimation}
              >
                不要
              </EnhancedButton>
              <EnhancedButton
                variant="play"
                onClick={handlePlayCards}
                disabled={!isValidPlay() || playingAnimation}
                loading={playingAnimation}
              >
                出牌
              </EnhancedButton>
            </div>
          ) : (
            <div className="action-buttons">
              <span className="waiting-text">等待中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  
  const renderWinScreen = () => {
    const isDraw = winner?.isDraw
    const winnerTeamName = winner?.teamName || (winner?.team === 'red' ? '红三方' : '黑三方')
    const isRedWinner = winner?.team === 'red'

    return (
      <motion.div
        className="win-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="win-content"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="win-header-compact">
            <span className="win-icon-inline">{isDraw ? '🤝' : '🏆'}</span>
            <span className={`win-title-inline ${isRedWinner ? 'text-red' : 'text-blue'}`}>
              {isDraw ? '平局 - 本局不计分' : `${winnerTeamName}获胜！`}
            </span>
            {!isDraw && (
              <span className="win-player-inline">（{players[winner?.playerId]?.name}最后出完）</span>
            )}
          </div>

          <div className="score-summary">
            <h3>{isDraw ? '当前积分' : '积分结算'}</h3>
            <div className="score-list">
              {players.map((player, index) => (
                <div key={index} className={`score-item ${teams[index] === 'red' ? 'red-team' : 'black-team'}`}>
                  <span className="player-name">{player.name}</span>
                  <span className="player-team">{teams[index] === 'red' ? '红三方' : '黑三方'}</span>
                  <span className={`player-score ${player.score >= 100 ? 'positive' : 'negative'}`}>
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="win-actions">
            <button className="btn btn-restart" onClick={startGame}>
              再来一局
            </button>
            <button className="btn btn-back" onClick={restart}>
              返回首页
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }
  
  return (
    <div className="game-board">
      {/* 背景装饰 */}
      <div className="bg-decoration">
        <div className="bg-pattern"></div>
        <div className="floating-elements"></div>
      </div>
      
      {/* 消息提示 - 已移除，因为每个玩家旁边已显示出牌信息 */}
      
      {/* 游戏内容 */}
      {phase === GAME_PHASES.WAITING && renderStartScreen()}
      {phase === GAME_PHASES.DEALING && (
        <div className="dealing-screen">
          <motion.div 
            className="dealing-animation"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            🃏
          </motion.div>
          <p>发牌中...</p>
        </div>
      )}
      {phase === GAME_PHASES.REVEALING && renderRevealPhase()}
      {phase === GAME_PHASES.PLAYING && renderGameTable()}
      {(phase === GAME_PHASES.ROUND_END || phase === GAME_PHASES.GAME_OVER) && winner && renderWinScreen()}
      
      {/* 右上角按钮组 */}
      {phase !== GAME_PHASES.WAITING && (
        <div className="top-right-buttons">
          <GameLog
            gameLog={gameLog}
            isOpen={showLog}
            onToggle={() => setShowLog(!showLog)}
          />
          <button className="rules-toggle-inline" onClick={() => setShowRules(true)}>
            玩法介绍
          </button>
        </div>
      )}

      {/* 游戏规则面板 */}
      <GameRules isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  )
}

export default GameBoard

