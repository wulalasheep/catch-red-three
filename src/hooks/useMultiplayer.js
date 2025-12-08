import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

// 服务器地址配置
// 优先使用环境变量 VITE_SOCKET_URL
// 本地开发时使用 localhost:3002
const getServerUrl = () => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  const hostname = window.location.hostname
  // 如果是localhost或127.0.0.1，直接用localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002'
  }
  // 否则使用当前页面的主机地址（IP或域名）
  return `http://${hostname}:3002`
}

const SERVER_URL = getServerUrl()

export const ROOM_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  IN_LOBBY: 'in_lobby',
  IN_ROOM: 'in_room',
  PLAYING: 'playing'
}

const useMultiplayer = () => {
  const [socket, setSocket] = useState(null)
  const [status, setStatus] = useState(ROOM_STATUS.DISCONNECTED)
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [room, setRoom] = useState(null)
  const [mySeat, setMySeat] = useState(-1)
  const [myHand, setMyHand] = useState([])
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState(null)
  const [roomList, setRoomList] = useState([])
  
  const socketRef = useRef(null)
  
  // 连接服务器
  const connect = useCallback((name) => {
    if (socketRef.current?.connected) return
    
    setStatus(ROOM_STATUS.CONNECTING)
    setPlayerName(name)
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    })
    
    newSocket.on('connect', () => {
      console.log('已连接到服务器')
      setStatus(ROOM_STATUS.CONNECTED)
      setPlayerId(newSocket.id)
      newSocket.emit('setName', name)
    })
    
    newSocket.on('disconnect', () => {
      console.log('与服务器断开连接')
      setStatus(ROOM_STATUS.DISCONNECTED)
    })
    
    newSocket.on('connect_error', (err) => {
      console.error('连接错误:', err)
      setError('无法连接到服务器')
      setStatus(ROOM_STATUS.DISCONNECTED)
    })
    
    // 房间创建成功
    newSocket.on('roomCreated', (data) => {
      console.log('房间已创建:', data.roomId)
      setRoomId(data.roomId)
      setRoom(data.room)
      setMySeat(0)
      setStatus(ROOM_STATUS.IN_ROOM)
    })
    
    // 加入房间成功
    newSocket.on('playerJoined', (data) => {
      console.log('玩家加入:', data)
      setRoom(data.room)
      const myIndex = data.room.players.findIndex(p => p.id === newSocket.id)
      if (myIndex >= 0) {
        setMySeat(myIndex)
        setStatus(ROOM_STATUS.IN_ROOM)
      }
    })
    
    // 加入房间失败
    newSocket.on('joinError', (data) => {
      setError(data.error)
    })
    
    // 玩家准备
    newSocket.on('playerReady', (data) => {
      setRoom(data.room)
    })
    
    // 玩家离开
    newSocket.on('playerLeft', (data) => {
      setRoom(data.room)
    })
    
    // 游戏开始（进入亮牌阶段）
    newSocket.on('gameStarted', (data) => {
      console.log('游戏开始:', data)
      setRoom(data.room)
      setMyHand(data.myHand)
      setMySeat(data.mySeat)
      setGameState({
        phase: data.phase || 'revealing',
        teams: data.teams,
        currentPlayer: data.firstPlayer,
        otherHands: data.otherHands,
        lastPlay: null,
        lastPlays: {},
        passCount: 0,
        finishedPlayers: [],
        roundNumber: 1,
        baseScore: 1,
        revealedCards: data.revealedCards || [[], [], [], [], []],
        revealTimer: data.revealTimer || 10
      })
      setStatus(ROOM_STATUS.PLAYING)
    })

    // 亮牌倒计时更新
    newSocket.on('revealTimerUpdate', (data) => {
      setGameState(prev => ({
        ...prev,
        revealTimer: data.timer
      }))
    })

    // 亮牌更新
    newSocket.on('revealedCardsUpdate', (data) => {
      setGameState(prev => ({
        ...prev,
        revealedCards: data.revealedCards
      }))
    })

    // 进入出牌阶段
    newSocket.on('gamePhaseChanged', (data) => {
      console.log('阶段切换:', data)
      setGameState(prev => ({
        ...prev,
        phase: data.phase,
        baseScore: data.baseScore,
        currentPlayer: data.currentPlayer,
        revealedCards: data.revealedCards
      }))
    })
    
    // 游戏状态更新
    newSocket.on('gameStateUpdate', (data) => {
      console.log('游戏状态更新:', data)
      setGameState(prev => ({
        ...prev,
        ...data
      }))
      
      // 更新自己的手牌（如果出牌了）
      if (data.handCounts && mySeat >= 0) {
        // 手牌数量更新由playCards返回处理
      }
    })
    
    // 游戏结束
    newSocket.on('gameEnded', (data) => {
      console.log('游戏结束:', data)
      setGameState(prev => ({
        ...prev,
        winner: data.winner
      }))
    })

    // 游戏重新开始
    newSocket.on('gameRestarted', (data) => {
      console.log('游戏重新开始:', data)
      setRoom(data.room)
      setMyHand(data.myHand)
      setMySeat(data.mySeat)
      setGameState({
        phase: data.phase || 'revealing',
        teams: data.teams,
        currentPlayer: data.firstPlayer,
        otherHands: data.otherHands,
        lastPlay: null,
        lastPlays: {},
        passCount: 0,
        finishedPlayers: [],
        roundNumber: (data.roundNumber || 1),
        baseScore: 1,
        revealedCards: data.revealedCards || [[], [], [], [], []],
        revealTimer: data.revealTimer || 10
      })
    })
    
    // 房间列表
    newSocket.on('roomList', (list) => {
      setRoomList(list)
    })
    
    socketRef.current = newSocket
    setSocket(newSocket)
  }, [mySeat])
  
  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
    }
    setStatus(ROOM_STATUS.DISCONNECTED)
    setRoom(null)
    setRoomId(null)
    setMySeat(-1)
    setMyHand([])
    setGameState(null)
  }, [])
  
  // 创建房间
  const createRoom = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('createRoom', { playerName })
  }, [playerName])
  
  // 加入房间
  const joinRoom = useCallback((targetRoomId) => {
    if (!socketRef.current) return
    setRoomId(targetRoomId)
    socketRef.current.emit('joinRoom', { roomId: targetRoomId, playerName })
  }, [playerName])
  
  // 准备
  const setReady = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('playerReady')
  }, [])
  
  // 开始游戏
  const startGame = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('startGame')
  }, [])
  
  // 出牌
  const playCards = useCallback((cards) => {
    if (!socketRef.current) return
    socketRef.current.emit('playCards', { cards })
    
    // 从手牌中移除
    const cardIds = cards.map(c => c.id)
    setMyHand(prev => prev.filter(c => !cardIds.includes(c.id)))
  }, [])
  
  // 不要
  const pass = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('pass')
  }, [])

  // 亮牌
  const toggleReveal = useCallback((card) => {
    if (!socketRef.current) return
    socketRef.current.emit('toggleReveal', { card })
  }, [])

  // 再来一局
  const restartGame = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('restartGame')
  }, [])
  
  // 获取房间列表
  const fetchRooms = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('getRooms')
  }, [])
  
  // 离开房间
  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('leaveRoom')
    setRoom(null)
    setRoomId(null)
    setMySeat(-1)
    setStatus(ROOM_STATUS.CONNECTED)
  }, [])
  
  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // 清理
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])
  
  return {
    // 状态
    status,
    playerName,
    playerId,
    roomId,
    room,
    mySeat,
    myHand,
    gameState,
    error,
    roomList,
    
    // 方法
    connect,
    disconnect,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    playCards,
    pass,
    toggleReveal,
    restartGame,
    fetchRooms,
    leaveRoom,
    clearError,
    setPlayerName
  }
}

export default useMultiplayer

