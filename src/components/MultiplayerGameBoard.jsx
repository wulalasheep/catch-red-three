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
import { getCardType, canBeat, containsHeartFive, CARD_TYPES, findAllValidPlays } from '../game/rules'
import { SUIT_SYMBOLS } from '../game/deck'
import { useInteractionFeedback } from '../hooks/useInteractionFeedback'
import { useParticleEffects } from '../hooks/useParticleEffects'

// 多人模式的游戏阶段
const MULTIPLAYER_PHASES = {
  REVEALING: 'revealing',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
}

const MultiplayerGameBoard = ({
  // 多人模式传入的状态
  room,
  roomId,
  mySeat,
  myHand,
  gameState,
  playerName,
  // 多人模式的操作方法
  playCards: serverPlayCards,
  pass: serverPass,
  toggleReveal: serverToggleReveal,
  restartGame: serverRestartGame,
  onLeave
}) => {
  const [selectedCards, setSelectedCards] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [playingAnimation, setPlayingAnimation] = useState(null)
  const [dragSelectRect, setDragSelectRect] = useState(null)
  const [phaseTransition, setPhaseTransition] = useState(null)
  const [message, setMessage] = useState(null)
  const [gameLog, setGameLog] = useState([])

  const handRefs = useRef({})
  const centerRef = useRef(null)
  const prevPhaseRef = useRef(null)
  const feedback = useInteractionFeedback()
  const { particles, triggerParticles, clearParticles } = useParticleEffects()

  // AI玩家位置 (电脑1左侧，电脑2左上，电脑3右上，电脑4右侧 - 对称布局)
  const aiPositions = ['left', 'top-left', 'top-right', 'right']

  // 当前游戏阶段
  const phase = gameState?.winner ? MULTIPLAYER_PHASES.GAME_OVER :
                gameState?.phase === 'revealing' ? MULTIPLAYER_PHASES.REVEALING :
                MULTIPLAYER_PHASES.PLAYING

  // 亮牌倒计时
  const revealTimer = gameState?.revealTimer || 0

  // 是否是我的回合
  const isMyTurn = gameState?.currentPlayer === mySeat

  // 是否是首轮（没有上家牌或自由出牌）
  const isFirstRound = !gameState?.lastPlay || gameState?.lastPlay?.playerId === mySeat

  // 获取所有玩家信息（适配到与单人模式相同的格式）
  const players = room?.players?.map((p, index) => ({
    id: index,
    name: p.name || `玩家${index + 1}`,
    isAI: p.isAI,
    score: p.score || 100
  })) || []

  // 获取手牌（适配格式）
  const hands = Array(5).fill([]).map((_, index) => {
    if (index === mySeat) {
      return myHand || []
    }
    // 其他玩家的手牌数
    const cardCount = gameState?.handCounts?.[index] || gameState?.otherHands?.[index] || 0
    return Array(cardCount).fill({ id: `back-${index}`, isBack: true })
  })

  // 获取队伍
  const teams = gameState?.teams || []

  // 基础分数
  const baseScore = gameState?.baseScore || 1

  // 回合数
  const roundNumber = gameState?.roundNumber || 1

  // 已出完的玩家
  const finishedPlayers = gameState?.finishedPlayers || []

  // 上家出的牌
  const lastPlay = gameState?.lastPlay

  // 各玩家最后出的牌
  const lastPlays = gameState?.lastPlays || {}

  // 亮出的牌
  const revealedCards = gameState?.revealedCards || Array(5).fill([])

  // 当前出牌玩家
  const currentPlayer = gameState?.currentPlayer ?? 0

  // 获胜者
  const winner = gameState?.winner

  // 显示消息
  useEffect(() => {
    if (gameState?.message) {
      setMessage(gameState.message)
      const timer = setTimeout(() => setMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.message])

  // 添加游戏日志
  useEffect(() => {
    if (gameState?.lastPlay && !gameState.lastPlay.pass) {
      const playerName = players[gameState.lastPlay.playerId]?.name || `玩家${gameState.lastPlay.playerId + 1}`
      const cards = gameState.lastPlay.cards || []
      const cardsStr = cards.map(c => `${SUIT_SYMBOLS[c.suit] || ''}${c.display}`).join(' ')
      setGameLog(prev => [...prev, {
        step: Date.now(),
        action: 'play',
        player: playerName,
        playerId: gameState.lastPlay.playerId,
        cards: cards,
        cardsStr: cardsStr
      }])
    } else if (gameState?.lastPlay?.pass) {
      const playerName = players[gameState.lastPlay.playerId]?.name || `玩家${gameState.lastPlay.playerId + 1}`
      setGameLog(prev => [...prev, {
        step: Date.now(),
        action: 'pass',
        player: playerName,
        playerId: gameState.lastPlay.playerId,
        cardsStr: '不要'
      }])
    }
  }, [gameState?.lastPlay])

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

    const positions = {
      0: { x: window.innerWidth / 2, y: window.innerHeight - 100 },
      1: { x: 100, y: window.innerHeight / 2 },
      2: { x: window.innerWidth / 2, y: 100 },
      3: { x: window.innerWidth - 100, y: 100 },
      4: { x: window.innerWidth - 100, y: window.innerHeight / 2 }
    }
    return positions[playerId] || { x: 0, y: 0 }
  }

  // 选择/取消选择卡牌
  const selectCard = useCallback((card) => {
    if (!isMyTurn) return

    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id)
      if (isSelected) {
        return prev.filter(c => c.id !== card.id)
      } else {
        return [...prev, card]
      }
    })
  }, [isMyTurn])

  // 拖拽选择处理
  const handleDragSelect = useCallback((selectedCardIds) => {
    if (!isMyTurn || !myHand) return

    const cardsToSelect = myHand.filter(card => selectedCardIds.includes(card.id))
    if (cardsToSelect.length > 0) {
      cardsToSelect.forEach(card => {
        selectCard(card)
      })
    }
  }, [isMyTurn, myHand, selectCard])

  // 验证所选牌是否可以出
  const isValidPlay = useCallback(() => {
    if (selectedCards.length === 0) return false

    // 检查牌型是否有效
    const cardType = getCardType(selectedCards)
    if (cardType.type === CARD_TYPES.INVALID) return false

    // 首轮必须包含红桃5（如果有首轮标记）
    if (gameState?.isFirstRound && !containsHeartFive(selectedCards)) return false

    // 如果没有上家牌，或者上家是自己（自由出牌权），可以自由出牌
    const isFreePlay = !lastPlay || lastPlay.playerId === mySeat
    if (isFreePlay) return true

    // 检查是否能管住上家
    return canBeat(selectedCards, lastPlay.cards)
  }, [selectedCards, gameState?.isFirstRound, lastPlay, mySeat])

  // 提示功能
  const hint = useCallback(() => {
    if (!myHand || myHand.length === 0) return

    const validPlays = findAllValidPlays(
      myHand,
      lastPlay?.cards,
      gameState?.isFirstRound
    )

    if (validPlays.length > 0) {
      // 选择第一个有效的出牌组合
      setSelectedCards(validPlays[0])
      feedback.hint && feedback.hint()
    } else {
      setMessage('没有可以出的牌，请选择"不要"')
    }
  }, [myHand, lastPlay, gameState?.isFirstRound, feedback])

  // 出牌
  const handlePlayCards = useCallback(() => {
    if (selectedCards.length === 0 || !isValidPlay()) return

    feedback.play && feedback.play()

    const fromPosition = getHandPosition(mySeat)
    const toPosition = getCenterPosition()

    // 设置动画状态
    setPlayingAnimation({
      cards: selectedCards,
      playerId: mySeat,
      fromPosition,
      toPosition
    })

    // 触发出牌粒子效果
    const centerPos = getCenterPosition()
    triggerParticles('playCard', centerPos.x, centerPos.y)

    // 延迟执行实际出牌逻辑
    const cardsToPlay = [...selectedCards]
    setTimeout(() => {
      serverPlayCards(cardsToPlay)
      setSelectedCards([])
      setPlayingAnimation(null)
    }, selectedCards.length * 150 + 800)
  }, [selectedCards, isValidPlay, mySeat, serverPlayCards, feedback, triggerParticles])

  // 不要
  const handlePass = useCallback(() => {
    feedback.pass && feedback.pass()
    serverPass()
    setSelectedCards([])
  }, [serverPass, feedback])

  // 渲染游戏桌面
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
          <span className="status-label">房间</span>
          <span className="status-value">{roomId}</span>
        </div>
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
                  {players[lastPlay.playerId]?.name || `玩家${lastPlay.playerId + 1}`}
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

      {/* 其他玩家（AI位置） */}
      {[1, 2, 3, 4].map((offset, i) => {
        const playerIndex = (mySeat + offset) % 5
        const player = players[playerIndex]
        return (
          <Player
            key={playerIndex}
            player={player}
            position={aiPositions[i]}
            isCurrentTurn={currentPlayer === playerIndex}
            cards={hands[playerIndex]}
            lastPlay={lastPlays[playerIndex]}
            revealedCards={revealedCards[playerIndex]}
            score={player?.score}
            team={teams[playerIndex]}
            isUser={false}
            handRef={el => handRefs.current[playerIndex] = el}
          />
        )
      })}

      {/* 玩家区域（自己） */}
      <div className="player-area">
        <Player
          player={{ ...players[mySeat], name: `${playerName} (我)` }}
          position="bottom"
          isCurrentTurn={isMyTurn}
          cards={myHand}
          lastPlay={lastPlays[mySeat]}
          revealedCards={revealedCards[mySeat]}
          score={players[mySeat]?.score}
          team={teams[mySeat]}
          isUser={true}
          selectedCards={selectedCards}
          onCardClick={selectCard}
          onDragSelect={handleDragSelect}
          disabled={!isMyTurn || playingAnimation}
          handRef={el => handRefs.current[mySeat] = el}
        />

        {/* 操作按钮 */}
        <div className="action-buttons-container">
          {(finishedPlayers.includes(mySeat) || !myHand || myHand.length === 0) ? (
            <div className="action-buttons">
              <span className="waiting-text">已出完</span>
            </div>
          ) : isMyTurn ? (
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
                onClick={handlePass}
                disabled={gameState?.isFirstRound || playingAnimation}
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
              <span className="waiting-text">等待 {players[currentPlayer]?.name} 出牌...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // 渲染亮牌阶段
  const renderRevealPhase = () => {
    // 获取自己手牌中已亮出的牌
    const myRevealedCards = revealedCards[mySeat] || []

    return (
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
            cards={myHand}
            selectedCards={myRevealedCards}
            onCardClick={(card) => {
              if (card.rank === 3) {
                serverToggleReveal(card)
              }
            }}
            disabled={false}
            position="bottom"
            revealedCards={myRevealedCards}
          />
        </div>
      </motion.div>
    )
  }

  // 渲染胜利界面
  const renderWinScreen = () => {
    const isDraw = winner?.isDraw
    const winnerTeamName = winner?.teamName || (winner?.team === 'red' ? '红三方' : '黑三方')
    const isRedWinner = winner?.team === 'red'
    const isMyTeamWin = teams[mySeat] === winner?.team

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
          <div className={`win-trophy ${isDraw ? 'draw' : (isRedWinner ? 'red-team' : 'other-team')}`}>
            {isDraw ? '🤝' : (isMyTeamWin ? '🎉' : '😢')}
          </div>
          <h2 className="win-title">
            {isDraw ? '平局！' : `${winnerTeamName}获胜！`}
          </h2>
          <p className="win-subtitle">
            {isDraw ? '本局不计分' : (isMyTeamWin ? '恭喜你获胜！' : '很遗憾，你输了')}
          </p>
          {!isDraw && winner?.playerId !== undefined && (
            <p className="win-player">最后出完：{players[winner.playerId]?.name}</p>
          )}

          <div className="score-summary">
            <h3>{isDraw ? '当前积分' : '积分结算'}</h3>
            <div className="score-list">
              {players.map((player, index) => (
                <div key={index} className={`score-item ${teams[index] === 'red' ? 'red-team' : 'black-team'} ${index === mySeat ? 'is-me' : ''}`}>
                  <span className="player-name">
                    {player.name}
                    {index === mySeat && ' (我)'}
                  </span>
                  <span className="player-team">{teams[index] === 'red' ? '红三方' : '黑三方'}</span>
                  <span className={`player-score ${player.score >= 100 ? 'positive' : 'negative'}`}>
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="win-actions">
            <button className="btn btn-primary" onClick={serverRestartGame}>
              再来一局
            </button>
            <button className="btn btn-secondary" onClick={onLeave}>
              返回大厅
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

      {/* 消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            className="game-message"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            key={message}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 游戏内容 */}
      {phase === MULTIPLAYER_PHASES.REVEALING && renderRevealPhase()}
      {phase === MULTIPLAYER_PHASES.PLAYING && renderGameTable()}
      {phase === MULTIPLAYER_PHASES.GAME_OVER && winner && renderWinScreen()}

      {/* 牌局记录面板 */}
      <GameLog
        gameLog={gameLog}
        isOpen={showLog}
        onToggle={() => setShowLog(!showLog)}
      />

      {/* 玩法介绍按钮 */}
      <button className="rules-toggle" onClick={() => setShowRules(true)}>
        玩法介绍
      </button>

      {/* 游戏规则面板 */}
      <GameRules isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  )
}

export default MultiplayerGameBoard
