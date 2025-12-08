const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')

// 从共享模块导入游戏核心逻辑
const GameCore = require('../shared/game-core.js')
const {
  // 常量
  SUITS,
  SUIT_SYMBOLS,
  CARD_TYPES,
  // 牌判断函数
  isRedThree,
  isHeartThree,
  isDiamondThree,
  isHeartFive,
  isJoker,
  // 牌组函数
  dealCards,
  // 牌型函数
  getCardType,
  canBeat,
  containsHeartFive,
  // 队伍函数
  findHeartFivePlayer,
  determineTeams,
  // 积分函数
  calculateBaseScore,
  calculateBonusScore,
  calculateScoreChanges,
  // 出牌提示
  findAllValidPlays
} = GameCore

const app = express()
app.use(cors())

const httpServer = createServer(app)

// 根据环境配置 CORS
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || '*']
  : ["http://localhost:3000", "http://localhost:5173"]

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
})

// 存储房间信息
const rooms = new Map()

// 存储玩家信息
const players = new Map()

// 创建房间
function createRoom(roomId, hostId, hostName) {
  const room = {
    id: roomId,
    hostId: hostId,
    players: [{
      id: hostId,
      name: hostName,
      seat: 0,
      ready: false,
      score: 100
    }],
    status: 'waiting', // waiting, playing, ended
    gameState: null,
    maxPlayers: 5,
    createdAt: Date.now()
  }
  rooms.set(roomId, room)
  return room
}

// 加入房间
function joinRoom(roomId, playerId, playerName) {
  const room = rooms.get(roomId)
  if (!room) return { error: '房间不存在' }
  if (room.players.length >= room.maxPlayers) return { error: '房间已满' }
  if (room.status !== 'waiting') return { error: '游戏已开始' }
  
  const seat = room.players.length
  room.players.push({
    id: playerId,
    name: playerName,
    seat: seat,
    ready: false,
    score: 100
  })
  
  return { room }
}

// 开始游戏
function startGame(roomId) {
  const room = rooms.get(roomId)
  if (!room) return { error: '房间不存在' }

  // 如果玩家不足5人，用AI补充
  while (room.players.length < 5) {
    room.players.push({
      id: `ai-${room.players.length}`,
      name: `电脑${room.players.length}`,
      seat: room.players.length,
      ready: true,
      score: 100,
      isAI: true
    })
  }

  const hands = dealCards()
  const { teams, heartThreePlayer, diamondThreePlayer } = determineTeams(hands)
  const firstPlayer = findHeartFivePlayer(hands)

  // 初始化亮牌数组（每个玩家的亮出牌）
  const revealedCards = [[], [], [], [], []]

  // 方片3必须亮出
  if (diamondThreePlayer >= 0) {
    const diamondThree = hands[diamondThreePlayer].find(c => isDiamondThree(c))
    if (diamondThree) {
      revealedCards[diamondThreePlayer].push(diamondThree)
    }
  }

  room.status = 'revealing' // 亮牌阶段
  room.gameState = {
    phase: 'revealing',
    hands: hands,
    teams: teams,
    heartThreePlayer: heartThreePlayer,
    diamondThreePlayer: diamondThreePlayer,
    currentPlayer: firstPlayer,
    lastPlay: null,
    lastPlays: [null, null, null, null, null],
    passCount: 0,
    isFirstRound: true,
    finishedPlayers: [],
    roundNumber: 1,
    baseScore: 1,
    revealedCards: revealedCards,
    revealTimer: 10,
    winner: null
  }

  return { room, hands, teams, firstPlayer, heartThreePlayer, diamondThreePlayer, revealedCards }
}

// 计算亮牌积分 - 使用共享模块
function calculateRevealScore(revealedCards) {
  return calculateBaseScore(revealedCards)
}

// 开始出牌阶段
function startPlayingPhase(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  const gameState = room.gameState

  // 计算亮牌积分
  gameState.baseScore = calculateRevealScore(gameState.revealedCards)

  // 切换到出牌阶段
  room.status = 'playing'
  gameState.phase = 'playing'

  // 通知所有玩家进入出牌阶段
  io.to(roomId).emit('gamePhaseChanged', {
    phase: 'playing',
    baseScore: gameState.baseScore,
    currentPlayer: gameState.currentPlayer,
    revealedCards: gameState.revealedCards
  })

  // 处理AI回合
  processAITurn(roomId)
}

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id)
  
  // 玩家设置名称
  socket.on('setName', (name) => {
    players.set(socket.id, { id: socket.id, name: name || '玩家' })
    socket.emit('nameSet', { id: socket.id, name })
  })
  
  // 创建房间
  socket.on('createRoom', (data) => {
    const player = players.get(socket.id)
    const roomId = uuidv4().substring(0, 6).toUpperCase()
    const room = createRoom(roomId, socket.id, data.playerName || player?.name || '房主')
    
    socket.join(roomId)
    players.set(socket.id, { ...player, roomId, name: data.playerName || player?.name })
    
    socket.emit('roomCreated', { roomId, room })
    console.log(`房间 ${roomId} 已创建`)
  })
  
  // 加入房间
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data
    const result = joinRoom(roomId, socket.id, playerName || '玩家')
    
    if (result.error) {
      socket.emit('joinError', { error: result.error })
      return
    }
    
    socket.join(roomId)
    players.set(socket.id, { id: socket.id, name: playerName, roomId })
    
    // 通知房间所有人
    io.to(roomId).emit('playerJoined', { room: result.room })
    console.log(`玩家 ${playerName} 加入房间 ${roomId}`)
  })
  
  // 玩家准备
  socket.on('playerReady', (data) => {
    const player = players.get(socket.id)
    if (!player?.roomId) return
    
    const room = rooms.get(player.roomId)
    if (!room) return
    
    const roomPlayer = room.players.find(p => p.id === socket.id)
    if (roomPlayer) {
      roomPlayer.ready = true
      io.to(player.roomId).emit('playerReady', { room })
    }
  })
  
  // 开始游戏
  socket.on('startGame', () => {
    const player = players.get(socket.id)
    if (!player?.roomId) return

    const room = rooms.get(player.roomId)
    if (!room || room.hostId !== socket.id) return

    const result = startGame(player.roomId)
    if (result.error) {
      socket.emit('startError', { error: result.error })
      return
    }

    // 给每个玩家发送他们自己的手牌，进入亮牌阶段
    room.players.forEach((p, index) => {
      if (!p.isAI) {
        const playerSocket = io.sockets.sockets.get(p.id)
        if (playerSocket) {
          playerSocket.emit('gameStarted', {
            room: result.room,
            myHand: result.hands[index],
            mySeat: index,
            teams: result.teams,
            firstPlayer: result.firstPlayer,
            phase: 'revealing',
            revealedCards: result.revealedCards,
            revealTimer: 10,
            otherHands: result.hands.map((h, i) => i === index ? null : h.length)
          })
        }
      }
    })

    // 开始亮牌倒计时
    let timer = 10
    const roomId = player.roomId
    const revealInterval = setInterval(() => {
      timer--

      const currentRoom = rooms.get(roomId)
      if (!currentRoom || currentRoom.status !== 'revealing') {
        clearInterval(revealInterval)
        return
      }

      currentRoom.gameState.revealTimer = timer

      // 广播倒计时
      io.to(roomId).emit('revealTimerUpdate', { timer })

      if (timer <= 0) {
        clearInterval(revealInterval)
        // 倒计时结束，进入出牌阶段
        startPlayingPhase(roomId)
      }
    }, 1000)

    console.log(`房间 ${player.roomId} 游戏开始，进入亮牌阶段`)
  })

  // 玩家亮牌
  socket.on('toggleReveal', (data) => {
    const player = players.get(socket.id)
    if (!player?.roomId) return

    const room = rooms.get(player.roomId)
    if (!room || room.status !== 'revealing') return

    const gameState = room.gameState
    const playerIndex = room.players.findIndex(p => p.id === socket.id)
    if (playerIndex < 0) return

    const { card } = data

    // 只能亮3
    if (card.rank !== 3) return

    // 方片3不能取消亮出
    if (isDiamondThree(card)) return

    const revealed = gameState.revealedCards[playerIndex]
    const cardIndex = revealed.findIndex(c => c.id === card.id)

    if (cardIndex >= 0) {
      // 取消亮牌
      revealed.splice(cardIndex, 1)
    } else {
      // 亮牌
      revealed.push(card)
    }

    // 广播亮牌更新
    io.to(player.roomId).emit('revealedCardsUpdate', {
      playerIndex,
      revealedCards: gameState.revealedCards
    })
  })
  
  // 玩家出牌
  socket.on('playCards', (data) => {
    const player = players.get(socket.id)
    if (!player?.roomId) return

    const room = rooms.get(player.roomId)
    if (!room || room.status !== 'playing') return

    const gameState = room.gameState
    const playerIndex = room.players.findIndex(p => p.id === socket.id)

    if (playerIndex !== gameState.currentPlayer) {
      socket.emit('playError', { error: '不是你的回合' })
      return
    }

    const { cards } = data

    // 验证牌型是否有效
    const cardType = getCardType(cards)
    if (cardType.type === CARD_TYPES.INVALID) {
      socket.emit('playError', { error: '无效的牌型' })
      return
    }

    // 首轮必须包含红桃5
    if (gameState.isFirstRound && !containsHeartFive(cards)) {
      socket.emit('playError', { error: '首轮必须出含红桃5的牌' })
      return
    }

    // 检查是否能管住上家
    if (gameState.lastPlay && gameState.lastPlay.playerId !== playerIndex) {
      if (!canBeat(cards, gameState.lastPlay.cards)) {
        socket.emit('playError', { error: '无法管住上家的牌' })
        return
      }
    }

    // 从手牌中移除
    const hand = gameState.hands[playerIndex]
    const cardIds = cards.map(c => c.id)
    gameState.hands[playerIndex] = hand.filter(c => !cardIds.includes(c.id))

    // 更新游戏状态
    gameState.lastPlay = { playerId: playerIndex, cards, pass: false }
    gameState.lastPlays[playerIndex] = gameState.lastPlay
    gameState.passCount = 0
    gameState.isFirstRound = false

    // 检查是否出完
    if (gameState.hands[playerIndex].length === 0) {
      gameState.finishedPlayers.push(playerIndex)

      // 检查游戏结束
      const gameEnded = checkGameEnd(room)
      if (gameEnded) {
        io.to(player.roomId).emit('gameEnded', { room, winner: gameState.winner })
        return
      }
    }

    // 下一个玩家
    gameState.currentPlayer = getNextPlayer(gameState.currentPlayer, gameState.finishedPlayers)

    // 广播游戏状态更新
    io.to(player.roomId).emit('gameStateUpdate', {
      lastPlay: gameState.lastPlay,
      lastPlays: gameState.lastPlays,
      currentPlayer: gameState.currentPlayer,
      handCounts: gameState.hands.map(h => h.length),
      finishedPlayers: gameState.finishedPlayers
    })

    // 处理AI回合
    processAITurn(player.roomId)
  })
  
  // 玩家不要
  socket.on('pass', () => {
    const player = players.get(socket.id)
    if (!player?.roomId) return

    const room = rooms.get(player.roomId)
    if (!room || room.status !== 'playing') return

    const gameState = room.gameState
    const playerIndex = room.players.findIndex(p => p.id === socket.id)

    if (playerIndex !== gameState.currentPlayer) {
      socket.emit('passError', { error: '不是你的回合' })
      return
    }

    gameState.lastPlays[playerIndex] = { playerId: playerIndex, cards: [], pass: true }
    gameState.passCount++

    // 检查是否新一轮
    const activePlayers = 5 - gameState.finishedPlayers.length
    const lastPlayerId = gameState.lastPlay?.playerId

    // 如果出牌的玩家已经出完了，需要所有活跃玩家都pass才能进入新一轮
    const lastPlayerFinished = lastPlayerId !== undefined && gameState.finishedPlayers.includes(lastPlayerId)
    const passNeeded = lastPlayerFinished ? activePlayers : activePlayers - 1

    if (gameState.passCount >= passNeeded) {
      // 新一轮
      gameState.lastPlay = null
      gameState.passCount = 0
      gameState.roundNumber++

      if (gameState.finishedPlayers.includes(lastPlayerId)) {
        gameState.currentPlayer = getNextPlayer(lastPlayerId, gameState.finishedPlayers)
      } else {
        gameState.currentPlayer = lastPlayerId
      }
    } else {
      gameState.currentPlayer = getNextPlayer(gameState.currentPlayer, gameState.finishedPlayers)
    }

    // 广播
    io.to(player.roomId).emit('gameStateUpdate', {
      lastPlay: gameState.lastPlay,
      lastPlays: gameState.lastPlays,
      currentPlayer: gameState.currentPlayer,
      passCount: gameState.passCount,
      roundNumber: gameState.roundNumber,
      playerPassed: playerIndex
    })

    // 处理AI回合
    processAITurn(player.roomId)
  })
  
  // 再来一局
  socket.on('restartGame', () => {
    const player = players.get(socket.id)
    if (!player?.roomId) return

    const room = rooms.get(player.roomId)
    if (!room) return

    // 重新发牌
    const hands = dealCards()
    const { teams, heartThreePlayer, diamondThreePlayer } = determineTeams(hands)
    const firstPlayer = findHeartFivePlayer(hands)

    // 初始化亮牌数组
    const revealedCards = [[], [], [], [], []]

    // 方片3必须亮出
    if (diamondThreePlayer >= 0) {
      const diamondThree = hands[diamondThreePlayer].find(c => isDiamondThree(c))
      if (diamondThree) {
        revealedCards[diamondThreePlayer].push(diamondThree)
      }
    }

    room.status = 'revealing'
    room.gameState = {
      phase: 'revealing',
      hands: hands,
      teams: teams,
      heartThreePlayer: heartThreePlayer,
      diamondThreePlayer: diamondThreePlayer,
      currentPlayer: firstPlayer,
      lastPlay: null,
      lastPlays: [null, null, null, null, null],
      passCount: 0,
      isFirstRound: true,
      finishedPlayers: [],
      roundNumber: 1,
      baseScore: 1,
      revealedCards: revealedCards,
      revealTimer: 10,
      winner: null
    }

    // 给每个玩家发送新手牌
    room.players.forEach((p, index) => {
      if (!p.isAI) {
        const playerSocket = io.sockets.sockets.get(p.id)
        if (playerSocket) {
          playerSocket.emit('gameRestarted', {
            room: room,
            myHand: hands[index],
            mySeat: index,
            teams: teams,
            firstPlayer: firstPlayer,
            phase: 'revealing',
            revealedCards: revealedCards,
            revealTimer: 10,
            otherHands: hands.map((h, i) => i === index ? null : h.length)
          })
        }
      }
    })

    // 开始亮牌倒计时
    let timer = 10
    const roomId = player.roomId
    const revealInterval = setInterval(() => {
      timer--

      const currentRoom = rooms.get(roomId)
      if (!currentRoom || currentRoom.status !== 'revealing') {
        clearInterval(revealInterval)
        return
      }

      currentRoom.gameState.revealTimer = timer
      io.to(roomId).emit('revealTimerUpdate', { timer })

      if (timer <= 0) {
        clearInterval(revealInterval)
        startPlayingPhase(roomId)
      }
    }, 1000)

    console.log(`房间 ${player.roomId} 再来一局`)
  })

  // 获取房间列表
  socket.on('getRooms', () => {
    const roomList = Array.from(rooms.values())
      .filter(r => r.status === 'waiting')
      .map(r => ({
        id: r.id,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hostName: r.players[0]?.name
      }))
    socket.emit('roomList', roomList)
  })
  
  // 断开连接
  socket.on('disconnect', () => {
    const player = players.get(socket.id)
    if (player?.roomId) {
      const room = rooms.get(player.roomId)
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id)
        if (room.players.length === 0) {
          rooms.delete(player.roomId)
        } else {
          io.to(player.roomId).emit('playerLeft', { room })
        }
      }
    }
    players.delete(socket.id)
    console.log('玩家断开:', socket.id)
  })
})

// 获取下一个玩家
function getNextPlayer(current, finishedPlayers) {
  let next = current === 0 ? 4 : current - 1
  let count = 0
  while (finishedPlayers.includes(next) && count < 5) {
    next = next === 0 ? 4 : next - 1
    count++
  }
  return next
}

// 计算积分 - 使用共享模块（统一规则：附加分 = 输方还有牌的玩家数）
function calculateScoresForRoom(room, winnerTeam) {
  const gameState = room.gameState
  const { teams, heartThreePlayer, baseScore, finishedPlayers, hands } = gameState

  // 使用共享模块计算附加分（统一规则）
  const bonusScore = calculateBonusScore(teams, finishedPlayers, hands, winnerTeam)
  const finalBaseScore = baseScore + bonusScore

  // 使用共享模块计算积分变化
  const scoreChanges = calculateScoreChanges(teams, heartThreePlayer, winnerTeam, finalBaseScore)

  // 应用积分变化
  room.players.forEach((player, index) => {
    player.score = (player.score || 100) + scoreChanges[index]
  })

  return { bonusScore, finalBaseScore }
}

// 检查游戏结束
function checkGameEnd(room) {
  const gameState = room.gameState
  const teams = gameState.teams
  const finished = gameState.finishedPlayers

  const redTeam = teams.map((t, i) => t === 'red' ? i : -1).filter(i => i >= 0)
  const blackTeam = teams.map((t, i) => t === 'other' ? i : -1).filter(i => i >= 0)

  const redAllFinished = redTeam.length > 0 && redTeam.every(p => finished.includes(p))
  const blackAllFinished = blackTeam.length > 0 && blackTeam.every(p => finished.includes(p))

  // 检查平局条件
  if (finished.length > 0) {
    const firstFinishedTeam = teams[finished[0]]
    const otherTeam = firstFinishedTeam === 'red' ? 'other' : 'red'
    const firstTeamPlayers = teams.map((t, i) => t === firstFinishedTeam ? i : -1).filter(i => i >= 0)
    const otherTeamPlayers = teams.map((t, i) => t === otherTeam ? i : -1).filter(i => i >= 0)

    // 如果对方全出完，但己方还有人有牌
    const otherTeamAllFinished = otherTeamPlayers.every(p => finished.includes(p))
    const firstTeamHasUnfinished = firstTeamPlayers.some(p => !finished.includes(p))

    if (otherTeamAllFinished && firstTeamHasUnfinished) {
      // 平局
      gameState.winner = {
        team: null,
        teamName: '平局',
        isDraw: true
      }
      room.status = 'ended'
      return true
    }
  }

  if (redAllFinished || blackAllFinished) {
    const winnerTeam = redAllFinished ? 'red' : 'other'

    // 计算积分
    calculateScoresForRoom(room, winnerTeam)

    gameState.winner = {
      team: winnerTeam,
      teamName: winnerTeam === 'red' ? '红三方' : '黑三方',
      playerId: finished[finished.length - 1]
    }
    room.status = 'ended'
    return true
  }
  return false
}

// 找出所有可出的牌（AI使用）- 使用共享模块
function findValidPlaysForAI(hand, lastCards, isFirstRound) {
  return findAllValidPlays(hand, lastCards, isFirstRound)
}

// 处理AI回合
function processAITurn(roomId) {
  const room = rooms.get(roomId)
  if (!room || room.status !== 'playing') return

  const gameState = room.gameState
  const aiPlayerIndex = gameState.currentPlayer
  const currentPlayer = room.players[aiPlayerIndex]

  if (!currentPlayer?.isAI) return

  // AI延迟出牌
  setTimeout(() => {
    const hand = gameState.hands[aiPlayerIndex]
    if (hand.length === 0) {
      gameState.currentPlayer = getNextPlayer(aiPlayerIndex, gameState.finishedPlayers)
      processAITurn(roomId)
      return
    }

    const lastPlay = gameState.lastPlay
    const lastCards = lastPlay?.cards || null
    const isFreePlay = !lastPlay || lastPlay.playerId === aiPlayerIndex

    // 找出所有可出的牌
    const validPlays = findValidPlaysForAI(hand, isFreePlay ? null : lastCards, gameState.isFirstRound)

    let chosenPlay = null

    if (validPlays.length > 0) {
      if (isFreePlay) {
        // 自由出牌时，选择牌数最少的组合（优先出单张）
        validPlays.sort((a, b) => a.length - b.length || a[0].value - b[0].value)
        chosenPlay = validPlays[0]
      } else {
        // 需要管牌时，70%概率出牌
        if (Math.random() > 0.3) {
          // 选择能管住的最小牌
          validPlays.sort((a, b) => {
            const aType = getCardType(a)
            const bType = getCardType(b)
            return aType.value - bType.value
          })
          chosenPlay = validPlays[0]
        }
      }
    }

    if (chosenPlay) {
      // 出牌
      const cardIds = chosenPlay.map(c => c.id)
      gameState.hands[aiPlayerIndex] = hand.filter(c => !cardIds.includes(c.id))
      gameState.lastPlay = { playerId: aiPlayerIndex, cards: chosenPlay, pass: false }
      gameState.lastPlays[aiPlayerIndex] = gameState.lastPlay
      gameState.passCount = 0
      gameState.isFirstRound = false

      if (gameState.hands[aiPlayerIndex].length === 0) {
        gameState.finishedPlayers.push(aiPlayerIndex)
        if (checkGameEnd(room)) {
          io.to(roomId).emit('gameEnded', { room, winner: gameState.winner })
          return
        }
      }

      gameState.currentPlayer = getNextPlayer(aiPlayerIndex, gameState.finishedPlayers)

      io.to(roomId).emit('gameStateUpdate', {
        lastPlay: gameState.lastPlay,
        lastPlays: gameState.lastPlays,
        currentPlayer: gameState.currentPlayer,
        passCount: gameState.passCount,
        handCounts: gameState.hands.map(h => h.length),
        finishedPlayers: gameState.finishedPlayers
      })
    } else {
      // 不要
      gameState.lastPlays[aiPlayerIndex] = { playerId: aiPlayerIndex, cards: [], pass: true }
      gameState.passCount++

      const activePlayers = 5 - gameState.finishedPlayers.length
      const lastPlayerId = gameState.lastPlay?.playerId
      const lastPlayerFinished = lastPlayerId !== undefined && gameState.finishedPlayers.includes(lastPlayerId)
      const passNeeded = lastPlayerFinished ? activePlayers : activePlayers - 1

      if (gameState.passCount >= passNeeded) {
        gameState.lastPlay = null
        gameState.passCount = 0
        gameState.roundNumber++

        if (gameState.finishedPlayers.includes(lastPlayerId)) {
          gameState.currentPlayer = getNextPlayer(lastPlayerId, gameState.finishedPlayers)
        } else {
          gameState.currentPlayer = lastPlayerId
        }

        io.to(roomId).emit('gameStateUpdate', {
          lastPlay: null,
          lastPlays: gameState.lastPlays,
          currentPlayer: gameState.currentPlayer,
          roundNumber: gameState.roundNumber,
          handCounts: gameState.hands.map(h => h.length)
        })
        processAITurn(roomId)
        return
      }

      gameState.currentPlayer = getNextPlayer(aiPlayerIndex, gameState.finishedPlayers)

      io.to(roomId).emit('gameStateUpdate', {
        lastPlay: gameState.lastPlay,
        lastPlays: gameState.lastPlays,
        currentPlayer: gameState.currentPlayer,
        passCount: gameState.passCount,
        handCounts: gameState.hands.map(h => h.length)
      })
    }

    // 继续处理AI
    processAITurn(roomId)

  }, 1000 + Math.random() * 1000)
}

const PORT = process.env.PORT || 3002

httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})

