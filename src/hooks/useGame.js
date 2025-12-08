import { useState, useCallback, useEffect, useRef } from 'react'
import { dealCards, isRedThree, isBlackThree, isDiamondThree, isHeartFive, isHeartThree, SUIT_SYMBOLS } from '../game/deck'
import { findHeartFivePlayer, getAllPlayerTeams, canBeat, getCardType, containsHeartFive, findAllValidPlays, calculateBaseScore, calculateBonusScore, calculateScoreChanges, CARD_TYPES } from '../game/rules'
import { aiSelectPlay, aiDecideReveal, getAIDelay, AI_LEVELS } from '../game/ai'

// 游戏阶段
export const GAME_PHASES = {
  WAITING: 'waiting',     // 等待开始
  DEALING: 'dealing',     // 发牌中
  REVEALING: 'revealing', // 亮牌阶段
  PLAYING: 'playing',     // 出牌阶段
  ROUND_END: 'roundEnd',  // 一轮结束
  GAME_OVER: 'gameOver'   // 游戏结束
}

const PLAYER_NAMES = ['玩家', '电脑1', '电脑2', '电脑3', '电脑4']

const useGame = () => {
  const [phase, setPhase] = useState(GAME_PHASES.WAITING)
  const [hands, setHands] = useState([[], [], [], [], []])
  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name, id) => ({ id, name, score: 100 }))
  )
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [lastPlay, setLastPlay] = useState(null) // { playerId, cards, pass }
  const [lastPlays, setLastPlays] = useState([null, null, null, null, null])
  const [selectedCards, setSelectedCards] = useState([])
  const [revealedCards, setRevealedCards] = useState([[], [], [], [], []])
  const [teams, setTeams] = useState(['other', 'other', 'other', 'other', 'other'])
  const [heartThreePlayer, setHeartThreePlayer] = useState(-1) // 持有红桃3的玩家索引
  const [diamondThreePlayer, setDiamondThreePlayer] = useState(-1) // 持有方片3的玩家索引
  const [baseScore, setBaseScore] = useState(1)
  const [revealTimer, setRevealTimer] = useState(10)
  const [winner, setWinner] = useState(null)
  const [roundHistory, setRoundHistory] = useState([])
  const [passCount, setPassCount] = useState(0)
  const [isFirstRound, setIsFirstRound] = useState(true)
  const [message, setMessage] = useState('')
  const [gameLog, setGameLog] = useState([]) // 牌局记录
  const [finishedPlayers, setFinishedPlayers] = useState([]) // 已出完牌的玩家
  const [roundNumber, setRoundNumber] = useState(1) // 当前轮数
  
  const aiTimeoutRef = useRef(null)

  // 使用 ref 存储最新状态，解决闭包问题
  const lastPlayRef = useRef(lastPlay)
  const passCountRef = useRef(passCount)
  const handsRef = useRef(hands)
  const isFirstRoundRef = useRef(isFirstRound)
  const winnerRef = useRef(winner)
  const teamsRef = useRef(teams)
  const heartThreePlayerRef = useRef(heartThreePlayer)
  const diamondThreePlayerRef = useRef(diamondThreePlayer)
  const finishedPlayersRef = useRef(finishedPlayers)
  
  // 同步更新 ref
  useEffect(() => { lastPlayRef.current = lastPlay }, [lastPlay])
  useEffect(() => { passCountRef.current = passCount }, [passCount])
  useEffect(() => { handsRef.current = hands }, [hands])
  useEffect(() => { isFirstRoundRef.current = isFirstRound }, [isFirstRound])
  useEffect(() => { winnerRef.current = winner }, [winner])
  useEffect(() => { teamsRef.current = teams }, [teams])
  useEffect(() => { heartThreePlayerRef.current = heartThreePlayer }, [heartThreePlayer])
  useEffect(() => { diamondThreePlayerRef.current = diamondThreePlayer }, [diamondThreePlayer])
  useEffect(() => { finishedPlayersRef.current = finishedPlayers }, [finishedPlayers])
  
  // 获取下一个玩家（跳过已出完牌的玩家）
  const getNextPlayer = useCallback((current) => {
    let next = current === 0 ? 4 : current - 1
    let count = 0
    // 跳过已出完牌的玩家，最多循环5次防止死循环
    while (finishedPlayersRef.current.includes(next) && count < 5) {
      next = next === 0 ? 4 : next - 1
      count++
    }
    return next
  }, [])
  
  // 获取还在游戏中的玩家数量
  const getActivePlayerCount = useCallback(() => {
    return 5 - finishedPlayersRef.current.length
  }, [])
  
  // 开始新游戏
  const startGame = useCallback(() => {
    const newHands = dealCards()
    setHands(newHands)
    handsRef.current = newHands
    
    // 确定阵营
    const newTeams = getAllPlayerTeams(newHands)
    setTeams(newTeams)
    teamsRef.current = newTeams

    // 找到持有红桃3的玩家（用于积分计算时翻倍）
    const heartThreeIdx = newHands.findIndex(hand => hand.some(card => isHeartThree(card)))
    setHeartThreePlayer(heartThreeIdx)
    heartThreePlayerRef.current = heartThreeIdx

    // 找到持有方片3的玩家
    const diamondThreeIdx = newHands.findIndex(hand => hand.some(card => isDiamondThree(card)))
    setDiamondThreePlayer(diamondThreeIdx)
    diamondThreePlayerRef.current = diamondThreeIdx

    // 找到持有红桃5的玩家
    const firstPlayer = findHeartFivePlayer(newHands)
    setCurrentPlayer(firstPlayer)
    
    // 重置状态
    setSelectedCards([])
    setLastPlay(null)
    lastPlayRef.current = null
    setLastPlays([null, null, null, null, null])
    setRevealedCards([[], [], [], [], []])
    setBaseScore(1)
    setWinner(null)
    winnerRef.current = null
    setPassCount(0)
    passCountRef.current = 0
    setIsFirstRound(true)
    isFirstRoundRef.current = true
    setMessage(`游戏开始！${PLAYER_NAMES[firstPlayer]}持有红桃5，首家出牌`)
    setGameLog([]) // 重置牌局记录
    setFinishedPlayers([]) // 重置已出完牌的玩家
    finishedPlayersRef.current = []
    setRoundNumber(1) // 重置轮数
    
    // 记录初始手牌
    console.log('=== 新游戏开始 ===')
    console.log('初始手牌:')
    newHands.forEach((hand, idx) => {
      console.log(`${PLAYER_NAMES[idx]}: ${hand.map(c => `${c.display}(${c.value})`).join(' ')}`)
    })
    console.log('阵营:', newTeams.map((t, i) => `${PLAYER_NAMES[i]}:${t}`).join(', '))
    console.log(`首家: ${PLAYER_NAMES[firstPlayer]}`)
    console.log('==================')
    
    // 进入发牌阶段
    setPhase(GAME_PHASES.DEALING)
    
    // 发牌动画后进入亮牌阶段
    setTimeout(() => {
      setPhase(GAME_PHASES.REVEALING)
      setRevealTimer(10)
      
      // AI自动亮牌
      newHands.forEach((hand, index) => {
        if (index !== 0) { // 非玩家
          const aiRevealed = aiDecideReveal(hand, AI_LEVELS.NORMAL)
          if (aiRevealed.length > 0) {
            setRevealedCards(prev => {
              const newRevealed = [...prev]
              newRevealed[index] = aiRevealed
              return newRevealed
            })
          }
        }
        // 强制亮方片3
        const diamondThree = hand.find(c => isDiamondThree(c))
        if (diamondThree) {
          setRevealedCards(prev => {
            const newRevealed = [...prev]
            if (!newRevealed[index].some(c => c.id === diamondThree.id)) {
              newRevealed[index] = [...newRevealed[index], diamondThree]
            }
            return newRevealed
          })
        }
      })
    }, 1500)
  }, [])
  
  // 亮牌倒计时
  useEffect(() => {
    if (phase !== GAME_PHASES.REVEALING) return
    
    if (revealTimer > 0) {
      const timer = setTimeout(() => {
        setRevealTimer(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 计算积分基数
      const allRevealed = revealedCards.flat()
      const newBaseScore = calculateBaseScore(allRevealed)
      setBaseScore(newBaseScore)
      setMessage(`亮牌结束！本轮积分基数: ${newBaseScore}`)
      
      // 进入出牌阶段
      setPhase(GAME_PHASES.PLAYING)
    }
  }, [phase, revealTimer, revealedCards])
  
  // 玩家选择亮牌
  const toggleReveal = useCallback((card) => {
    if (phase !== GAME_PHASES.REVEALING) return
    
    // 方片3必须亮出，不能取消
    if (isDiamondThree(card)) return
    
    // 只能亮3
    if (card.rank !== 3) return
    
    setRevealedCards(prev => {
      const newRevealed = [...prev]
      const playerRevealed = newRevealed[0]
      const index = playerRevealed.findIndex(c => c.id === card.id)
      
      if (index >= 0) {
        newRevealed[0] = playerRevealed.filter(c => c.id !== card.id)
      } else {
        newRevealed[0] = [...playerRevealed, card]
      }
      
      return newRevealed
    })
  }, [phase])
  
  // 选择卡牌
  const selectCard = useCallback((card) => {
    if (phase !== GAME_PHASES.PLAYING || currentPlayer !== 0) return
    
    setSelectedCards(prev => {
      const index = prev.findIndex(c => c.id === card.id)
      if (index >= 0) {
        return prev.filter(c => c.id !== card.id)
      }
      return [...prev, card].sort((a, b) => b.value - a.value)
    })
  }, [phase, currentPlayer])
  
  // 出牌
  const playCards = useCallback(() => {
    if (phase !== GAME_PHASES.PLAYING) return
    if (selectedCards.length === 0) return

    // 验证牌型
    const cardType = getCardType(selectedCards)
    if (cardType.type === CARD_TYPES.INVALID) {
      setMessage('无效的牌型！')
      return
    }

    // 首轮必须出含红桃5的牌
    if (isFirstRoundRef.current && !containsHeartFive(selectedCards)) {
      setMessage('首轮必须出含红桃5的牌！')
      return
    }

    // 验证是否能管上家
    const currentLastPlay = lastPlayRef.current
    // 如果没有上家牌，或者上家是自己（自己拥有出牌权），可以自由出牌
    const isFreePlay = !currentLastPlay || currentLastPlay.playerId === currentPlayer
    if (!isFreePlay && !canBeat(selectedCards, currentLastPlay.cards)) {
      setMessage('出的牌管不住上家！')
      return
    }

    // 执行出牌
    executePlay(currentPlayer, selectedCards)
    setSelectedCards([])
  }, [phase, currentPlayer, selectedCards])
  
  // 执行出牌逻辑
  const executePlay = useCallback((playerId, cards) => {
    // 获取上家信息用于记录
    const prevLastPlay = lastPlayRef.current
    const prevLastCards = prevLastPlay?.cards || null
    
    // 计算出牌后剩余手牌数量
    const currentHand = handsRef.current[playerId]
    const remainingCards = currentHand.filter(card => !cards.some(c => c.id === card.id))
    const playerFinished = remainingCards.length === 0
    
    // 从手牌中移除
    setHands(prev => {
      const newHands = [...prev]
      newHands[playerId] = remainingCards
      handsRef.current = newHands
      return newHands
    })
    
    // 记录出牌
    const play = { playerId, cards, pass: false }
    setLastPlay(play)
    lastPlayRef.current = play
    
    setLastPlays(prev => {
      const newPlays = [...prev]
      newPlays[playerId] = play
      return newPlays
    })
    
    // 添加牌局日志
    const logEntry = {
      step: Date.now(),
      player: PLAYER_NAMES[playerId],
      playerId,
      action: 'play',
      cards: cards.map(c => ({ display: c.display, value: c.value, rank: c.rank })),
      cardsStr: cards.map(c => `${SUIT_SYMBOLS[c.suit] || ''}${c.display}`).join(' '),
      prevCards: prevLastCards ? prevLastCards.map(c => ({ display: c.display, value: c.value, rank: c.rank })) : null,
      prevCardsStr: prevLastCards ? prevLastCards.map(c => `${SUIT_SYMBOLS[c.suit] || ''}${c.display}`).join(' ') : '无',
      passCount: passCountRef.current
    }
    setGameLog(prev => [...prev, logEntry])
    console.log(`[牌局记录] ${logEntry.player} 出牌: ${logEntry.cardsStr} | 上家: ${logEntry.prevCardsStr}`)
    
    setPassCount(0)
    passCountRef.current = 0
    setIsFirstRound(false)
    isFirstRoundRef.current = false
    setMessage(`${PLAYER_NAMES[playerId]}出牌: ${cards.map(c => c.display).join(' ')}`)
    
    // 处理玩家出完牌的情况
    if (playerFinished) {
      const newFinished = [...finishedPlayersRef.current, playerId]
      setFinishedPlayers(newFinished)
      finishedPlayersRef.current = newFinished
      
      console.log(`[牌局记录] ${PLAYER_NAMES[playerId]} 出完所有牌！`)
      setGameLog(prev => [...prev, {
        step: Date.now(),
        player: PLAYER_NAMES[playerId],
        playerId,
        action: 'finished',
        cards: [],
        cardsStr: '出完所有牌！',
        prevCards: null,
        prevCardsStr: '',
        passCount: 0
      }])
      
      // 检查游戏是否结束
      setTimeout(() => checkGameEnd(playerId, newFinished), 100)
    }
    
    // 下一个玩家（逆时针，跳过已出完的玩家）
    setCurrentPlayer(prev => getNextPlayer(prev))
  }, [getNextPlayer])
  
  // 不要（过牌）
  const pass = useCallback(() => {
    if (phase !== GAME_PHASES.PLAYING) return
    if (currentPlayer !== 0) return

    // 如果玩家已经出完牌，不应该到这里（应该被自动跳过）
    if (finishedPlayersRef.current.includes(0)) {
      setCurrentPlayer(getNextPlayer(0))
      return
    }

    // 首轮必须出牌
    if (isFirstRoundRef.current) {
      setMessage('首轮必须出牌！')
      return
    }

    const lastPlay = lastPlayRef.current

    // 如果没有上家牌（新一轮开始），必须出牌
    if (!lastPlay) {
      setMessage('新一轮开始，必须出牌！')
      return
    }

    // 如果上家就是自己，说明其他人都pass了，必须出牌
    if (lastPlay.playerId === 0) {
      setMessage('轮到你出牌，必须出！')
      return
    }

    executePass(currentPlayer)
  }, [phase, currentPlayer, getNextPlayer])
  
  // 执行过牌逻辑
  const executePass = useCallback((playerId) => {
    const play = { playerId, cards: [], pass: true }
    setLastPlays(prev => {
      const newPlays = [...prev]
      newPlays[playerId] = play
      return newPlays
    })
    
    const newPassCount = passCountRef.current + 1
    setPassCount(newPassCount)
    passCountRef.current = newPassCount
    
    // 添加牌局日志
    const prevLastPlay = lastPlayRef.current
    const prevLastCards = prevLastPlay?.cards || null
    const logEntry = {
      step: Date.now(),
      player: PLAYER_NAMES[playerId],
      playerId,
      action: 'pass',
      cards: [],
      cardsStr: '不要',
      prevCards: prevLastCards ? prevLastCards.map(c => ({ display: c.display, value: c.value, rank: c.rank })) : null,
      prevCardsStr: prevLastCards ? prevLastCards.map(c => `${c.display}(${c.value})`).join(' ') : '无',
      passCount: newPassCount
    }
    setGameLog(prev => [...prev, logEntry])
    console.log(`[牌局记录] ${logEntry.player} 不要 | 上家: ${logEntry.prevCardsStr} | 连续pass: ${newPassCount}`)
    
    setMessage(`${PLAYER_NAMES[playerId]}不要`)

    // 获取最后出牌的玩家
    const lastPlayerId = prevLastPlay?.playerId

    // 计算还在游戏中的玩家数量（排除出完牌的玩家）
    const activePlayers = 5 - finishedPlayersRef.current.length

    // 计算需要多少人pass才能结束这一轮
    // 如果最后出牌的人已经出完牌了，那么需要所有活跃玩家都pass
    // 否则需要 (activePlayers - 1) 个玩家pass（出牌的人不需要pass）
    const lastPlayerFinished = lastPlayerId !== undefined && finishedPlayersRef.current.includes(lastPlayerId)
    const passNeeded = lastPlayerFinished ? activePlayers : activePlayers - 1

    console.log(`[Pass判定] 活跃玩家: ${activePlayers}, 最后出牌者: ${PLAYER_NAMES[lastPlayerId]}, 已出完: ${lastPlayerFinished}, 需要pass数: ${passNeeded}, 当前pass数: ${newPassCount}`)

    // 检查是否这一轮结束（除了出牌的人，其他有牌的人都pass了）
    if (newPassCount >= passNeeded) {
      // 这一轮结束
      if (lastPlayerId !== undefined) {
        // 新一轮开始
        setRoundNumber(prev => {
          const newRoundNumber = prev + 1
          console.log(`[牌局记录] === 第${prev}轮结束 ===`)
          setGameLog(prevLog => [...prevLog, {
            step: Date.now(),
            player: '系统',
            playerId: -1,
            action: 'newRound',
            cards: [],
            cardsStr: `第${prev}轮结束`,
            prevCards: null,
            prevCardsStr: '',
            passCount: 0
          }])
          return newRoundNumber
        })

        // 重置lastPlay和passCount
        setLastPlay(null)
        lastPlayRef.current = null
        setPassCount(0)
        passCountRef.current = 0

        // 如果最后出牌的人已经出完牌，找下一个有牌的人（逆时针方向）
        if (lastPlayerFinished) {
          const nextPlayer = getNextPlayer(lastPlayerId)
          console.log(`[牌局记录] ${PLAYER_NAMES[lastPlayerId]}已出完牌，下一轮由${PLAYER_NAMES[nextPlayer]}出牌`)
          setMessage(`${PLAYER_NAMES[lastPlayerId]}已出完牌，${PLAYER_NAMES[nextPlayer]}出牌`)
          setCurrentPlayer(nextPlayer)
        } else {
          console.log(`[牌局记录] ${PLAYER_NAMES[lastPlayerId]}获得出牌权`)
          setMessage(`${PLAYER_NAMES[lastPlayerId]}获得出牌权`)
          setCurrentPlayer(lastPlayerId)
        }
        return
      }
    }

    // 下一个玩家（跳过已出完的玩家）
    setCurrentPlayer(prev => getNextPlayer(prev))
  }, [getNextPlayer])
  
  // 检查游戏是否结束
  // 获胜规则：
  //   1. 该方有玩家是第一个出完手牌的
  //   2. 该方所有玩家都出完手牌，且对方还有玩家手中有牌
  // 平局规则：
  //   一方玩家第一个出完，但另一方所有玩家比这一方至少一个玩家先出完，则平局不计分
  const checkGameEnd = useCallback((lastFinishedPlayer, finishedList) => {
    const currentTeams = teamsRef.current

    // 找出红三方和黑三方的玩家
    const redTeamPlayers = currentTeams.map((team, index) => team === 'red' ? index : -1).filter(i => i >= 0)
    const blackTeamPlayers = currentTeams.map((team, index) => team === 'other' ? index : -1).filter(i => i >= 0)

    console.log('[游戏结束判定] 红三方玩家:', redTeamPlayers.map(p => PLAYER_NAMES[p]))
    console.log('[游戏结束判定] 黑三方玩家:', blackTeamPlayers.map(p => PLAYER_NAMES[p]))
    console.log('[游戏结束判定] 已出完的玩家(按顺序):', finishedList.map(p => PLAYER_NAMES[p]))

    // 检查红三方是否全部出完
    const redTeamAllFinished = redTeamPlayers.length > 0 && redTeamPlayers.every(p => finishedList.includes(p))
    // 检查黑三方是否全部出完
    const blackTeamAllFinished = blackTeamPlayers.length > 0 && blackTeamPlayers.every(p => finishedList.includes(p))

    console.log('[游戏结束判定] 红三方全出完:', redTeamAllFinished)
    console.log('[游戏结束判定] 黑三方全出完:', blackTeamAllFinished)

    // 只有当一方全部出完时才判定游戏结束
    if (redTeamAllFinished || blackTeamAllFinished) {
      // 找出第一个出完的玩家属于哪一方
      const firstFinishedPlayer = finishedList[0]
      const firstFinishedTeam = currentTeams[firstFinishedPlayer]
      const firstFinishedTeamName = firstFinishedTeam === 'red' ? '红三方' : '黑三方'

      console.log('[游戏结束判定] 第一个出完的玩家:', PLAYER_NAMES[firstFinishedPlayer], '属于:', firstFinishedTeamName)

      // 判断哪一方全部出完
      const finishedTeam = redTeamAllFinished ? 'red' : 'other'
      const finishedTeamName = redTeamAllFinished ? '红三方' : '黑三方'
      const finishedTeamPlayers = redTeamAllFinished ? redTeamPlayers : blackTeamPlayers
      const otherTeamPlayers = redTeamAllFinished ? blackTeamPlayers : redTeamPlayers

      // 检查对方是否还有人有牌
      const otherTeamHasCards = otherTeamPlayers.some(p => !finishedList.includes(p))

      console.log('[游戏结束判定] 出完的队伍:', finishedTeamName)
      console.log('[游戏结束判定] 对方是否还有牌:', otherTeamHasCards)

      // 判定胜负
      // 获胜条件：第一个出完的是本方 + 本方全出完 + 对方还有人有牌
      if (firstFinishedTeam === finishedTeam && otherTeamHasCards) {
        // 使用共享模块计算附加积分（统一规则：输方还有牌的玩家数）
        const currentHands = handsRef.current
        const bonusScore = calculateBonusScore(currentTeams, finishedList, currentHands, finishedTeam)
        console.log(`[附加积分] 使用统一规则计算，附加分: ${bonusScore}`)

        // 该方获胜
        const winnerInfo = {
          playerId: lastFinishedPlayer,
          team: finishedTeam,
          teamName: finishedTeamName,
          winners: finishedTeamPlayers,
          finishedOrder: finishedList,
          isDraw: false,
          bonusScore: bonusScore
        }
        setWinner(winnerInfo)
        winnerRef.current = winnerInfo
        setPhase(GAME_PHASES.ROUND_END)

        // 计算积分（包含附加积分）
        calculateScores(finishedTeam, bonusScore)

        setMessage(`${finishedTeamName}获胜！`)

        console.log(`[牌局记录] === 游戏结束 === ${finishedTeamName}获胜！`)

        // 添加到游戏日志
        setGameLog(prev => [...prev, {
          step: Date.now(),
          player: '系统',
          playerId: -1,
          action: 'gameEnd',
          cards: [],
          cardsStr: `游戏结束！${finishedTeamName}获胜！`,
          prevCards: null,
          prevCardsStr: '',
          passCount: 0
        }])

        return true
      } else {
        // 平局情况：
        // 1. 第一个出完的不是本方（另一方先出完一人，但本方全出完了）
        // 2. 或者对方也全出完了（双方同时出完）
        const winnerInfo = {
          playerId: lastFinishedPlayer,
          team: null,
          teamName: '平局',
          winners: [],
          finishedOrder: finishedList,
          isDraw: true
        }
        setWinner(winnerInfo)
        winnerRef.current = winnerInfo
        setPhase(GAME_PHASES.ROUND_END)

        // 平局不计算积分
        setMessage('平局！本局不计分')

        console.log(`[牌局记录] === 游戏结束 === 平局！不计分`)

        // 添加到游戏日志
        setGameLog(prev => [...prev, {
          step: Date.now(),
          player: '系统',
          playerId: -1,
          action: 'gameEnd',
          cards: [],
          cardsStr: '游戏结束！平局，不计分',
          prevCards: null,
          prevCardsStr: '',
          passCount: 0
        }])

        return true
      }
    } else {
      // 游戏继续，提示有玩家出完
      setMessage(`${PLAYER_NAMES[lastFinishedPlayer]}出完所有牌，游戏继续！`)
      return false
    }
  }, [])
  
  // 计算积分 - 使用共享模块
  // 规则：红桃3玩家积分翻倍
  // 附加积分：统一为输方还有牌的玩家数
  const calculateScores = useCallback((winnerTeam, bonusScore = 0) => {
    const currentTeams = teamsRef.current
    const heartThreeIdx = heartThreePlayerRef.current
    const finalBaseScore = baseScore + bonusScore

    console.log(`[积分计算] 基础分: ${baseScore}, 附加分: ${bonusScore}, 最终基础分: ${finalBaseScore}`)

    // 使用共享模块计算积分变化
    const scoreChanges = calculateScoreChanges(currentTeams, heartThreeIdx, winnerTeam, finalBaseScore)

    setPlayers(prev => {
      return prev.map((player, index) => {
        console.log(`[积分计算] ${player.name}: 积分变化: ${scoreChanges[index]}`)
        return {
          ...player,
          score: player.score + scoreChanges[index]
        }
      })
    })
  }, [baseScore])
  
  // 检查玩家是否已出完牌，自动跳过
  useEffect(() => {
    if (phase !== GAME_PHASES.PLAYING) return
    if (winnerRef.current) return
    
    // 检查当前玩家是否已经没牌（已出完或手牌为空）
    const currentHand = handsRef.current[currentPlayer]
    const isFinished = finishedPlayersRef.current.includes(currentPlayer) || 
                       (currentHand && currentHand.length === 0)
    
    if (isFinished) {
      // 如果还没记录到finishedPlayers，先记录
      if (!finishedPlayersRef.current.includes(currentPlayer)) {
        const newFinished = [...finishedPlayersRef.current, currentPlayer]
        setFinishedPlayers(newFinished)
        finishedPlayersRef.current = newFinished
        console.log(`[自动记录] ${PLAYER_NAMES[currentPlayer]} 手牌为空，加入已出完列表`)

        // 检查游戏是否结束
        const gameEnded = checkGameEnd(currentPlayer, newFinished)
        if (gameEnded) return
      }
      
      console.log(`[跳过] ${PLAYER_NAMES[currentPlayer]} 已出完牌，跳过`)
      setCurrentPlayer(getNextPlayer(currentPlayer))
      return
    }
  }, [phase, currentPlayer, getNextPlayer, checkGameEnd])
  
  // AI出牌逻辑
  useEffect(() => {
    if (phase !== GAME_PHASES.PLAYING) return
    if (currentPlayer === 0) return // 玩家回合
    if (winnerRef.current) return

    // 检查当前玩家是否已经没牌（已出完）
    if (finishedPlayersRef.current.includes(currentPlayer)) {
      return // 会由上面的useEffect处理
    }

    // AI思考
    aiTimeoutRef.current = setTimeout(() => {
      // 使用 ref 获取最新状态
      const hand = handsRef.current[currentPlayer]
      const mustContainHeartFive = isFirstRoundRef.current
      const lastPlay = lastPlayRef.current

      // 判断是否是自由出牌（没有上家牌，或者上家是自己）
      const isFreePlay = !lastPlay || lastPlay.playerId === currentPlayer

      // 获取上家出的牌（用于比较）
      const lastCards = isFreePlay ? null : lastPlay?.cards

      // AI选择出牌
      const aiPlay = aiSelectPlay(
        hand,
        lastCards,
        mustContainHeartFive,
        AI_LEVELS.NORMAL
      )

      if (aiPlay) {
        // 再次验证：确保选择的牌确实能管住上家
        if (lastCards && lastCards.length > 0) {
          if (!canBeat(aiPlay, lastCards)) {
            // 验证失败，AI选择不要
            executePass(currentPlayer)
            return
          }
        }
        executePlay(currentPlayer, aiPlay)
      } else {
        // 检查是否必须出牌（首轮或自由出牌）
        if (mustContainHeartFive || isFreePlay) {
          // 强制出牌：找任何可以出的牌
          const validPlays = findAllValidPlays(hand, null, mustContainHeartFive)
          if (validPlays.length > 0) {
            executePlay(currentPlayer, validPlays[0])
            return
          }
        }
        executePass(currentPlayer)
      }
    }, getAIDelay(AI_LEVELS.NORMAL))

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
      }
    }
  }, [phase, currentPlayer, getNextPlayer])
  
  // 重新开始
  const restart = useCallback(() => {
    setPhase(GAME_PHASES.WAITING)
    setHands([[], [], [], [], []])
    setPlayers(PLAYER_NAMES.map((name, id) => ({ id, name, score: 100 })))
    setCurrentPlayer(0)
    setLastPlay(null)
    lastPlayRef.current = null
    setLastPlays([null, null, null, null, null])
    setSelectedCards([])
    setRevealedCards([[], [], [], [], []])
    setTeams(['other', 'other', 'other', 'other', 'other'])
    setHeartThreePlayer(-1)
    heartThreePlayerRef.current = -1
    setDiamondThreePlayer(-1)
    diamondThreePlayerRef.current = -1
    setBaseScore(1)
    setWinner(null)
    winnerRef.current = null
    setPassCount(0)
    passCountRef.current = 0
    setIsFirstRound(true)
    isFirstRoundRef.current = true
    setMessage('')
    setGameLog([]) // 重置牌局记录
    setFinishedPlayers([]) // 重置已出完牌的玩家
    finishedPlayersRef.current = []
    setRoundNumber(1) // 重置轮数
  }, [])
  
  // 提示功能
  const hint = useCallback(() => {
    if (phase !== GAME_PHASES.PLAYING || currentPlayer !== 0) return

    const hand = handsRef.current[0]
    const mustContainHeartFive = isFirstRoundRef.current
    const lastPlay = lastPlayRef.current
    // 如果没有上家牌，或者上家是自己（自己拥有出牌权），可以自由出牌
    const isFreePlay = !lastPlay || lastPlay.playerId === 0
    const lastCards = isFreePlay ? null : lastPlay?.cards
    const validPlays = findAllValidPlays(hand, lastCards, mustContainHeartFive)

    if (validPlays.length > 0) {
      // 选择最小的能打的牌
      setSelectedCards(validPlays[validPlays.length - 1])
      setMessage('已为您选择推荐出牌')
    } else {
      setMessage('没有能管住的牌，请选择"不要"')
    }
  }, [phase, currentPlayer])
  
  return {
    // 状态
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
    gameLog, // 牌局记录
    roundNumber, // 当前轮数
    finishedPlayers, // 已出完牌的玩家
    
    // 操作
    startGame,
    selectCard,
    playCards,
    pass,
    restart,
    toggleReveal,
    hint
  }
}

export default useGame
