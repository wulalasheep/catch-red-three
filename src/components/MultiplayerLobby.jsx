import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useMultiplayer, { ROOM_STATUS } from '../hooks/useMultiplayer'
import MultiplayerGameBoard from './MultiplayerGameBoard'

const MultiplayerLobby = ({ onStartSinglePlayer }) => {
  const {
    status,
    playerName,
    roomId,
    room,
    mySeat,
    myHand,
    gameState,
    error,
    roomList,
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
  } = useMultiplayer()
  
  const [inputName, setInputName] = useState('')
  const [inputRoomId, setInputRoomId] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)
  
  // 定期刷新房间列表
  useEffect(() => {
    if (status === ROOM_STATUS.CONNECTED) {
      fetchRooms()
      const interval = setInterval(fetchRooms, 5000)
      return () => clearInterval(interval)
    }
  }, [status, fetchRooms])
  
  // 渲染连接界面
  const renderConnectScreen = () => (
    <motion.div 
      className="multiplayer-connect"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>🎮 多人游戏</h2>
      <p className="subtitle">与真人玩家一起游戏</p>
      
      <div className="input-group">
        <label>输入你的昵称</label>
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          placeholder="请输入昵称"
          maxLength={10}
        />
      </div>
      
      <div className="button-group">
        <button 
          className="btn btn-primary"
          onClick={() => connect(inputName || '玩家')}
          disabled={status === ROOM_STATUS.CONNECTING}
        >
          {status === ROOM_STATUS.CONNECTING ? '连接中...' : '连接服务器'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={onStartSinglePlayer}
        >
          单人模式（电脑对战）
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}
    </motion.div>
  )
  
  // 渲染大厅界面
  const renderLobbyScreen = () => (
    <motion.div 
      className="multiplayer-lobby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="lobby-header">
        <h2>🏠 游戏大厅</h2>
        <p>欢迎，{playerName}！</p>
      </div>
      
      <div className="lobby-actions">
        <button className="btn btn-primary" onClick={createRoom}>
          创建房间
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => setShowJoinInput(!showJoinInput)}
        >
          加入房间
        </button>
        
        <button className="btn btn-outline" onClick={disconnect}>
          返回
        </button>
      </div>
      
      {showJoinInput && (
        <motion.div 
          className="join-input"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            placeholder="输入房间号"
            maxLength={6}
          />
          <button 
            className="btn btn-primary"
            onClick={() => joinRoom(inputRoomId)}
            disabled={!inputRoomId}
          >
            加入
          </button>
        </motion.div>
      )}
      
      <div className="room-list">
        <h3>可加入的房间</h3>
        {roomList.length === 0 ? (
          <p className="no-rooms">暂无房间，创建一个吧！</p>
        ) : (
          <ul>
            {roomList.map(r => (
              <li key={r.id} onClick={() => joinRoom(r.id)}>
                <span className="room-id">房间 {r.id}</span>
                <span className="room-host">房主: {r.hostName}</span>
                <span className="room-players">{r.playerCount}/{r.maxPlayers}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}
    </motion.div>
  )
  
  // 渲染房间等待界面
  const renderRoomScreen = () => {
    const isHost = room?.hostId === room?.players?.[0]?.id && mySeat === 0
    const allReady = room?.players?.filter(p => !p.isAI).every(p => p.ready)
    
    return (
      <motion.div
        className="multiplayer-room"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="room-header-compact">
          <span className="room-id-badge">房间 {roomId}</span>
          <span className="room-tip-inline">分享房间号给好友加入</span>
        </div>
        
        <div className="player-list">
          <h3>玩家列表 ({room?.players?.length || 0}/5)</h3>
          <ul>
            {room?.players?.map((player, index) => (
              <li key={player.id} className={player.id === room.hostId ? 'host' : ''}>
                <span className="seat">座位 {index + 1}</span>
                <span className="name">
                  {player.isAI ? '🤖' : '👤'} {player.name}
                  {player.id === room.hostId && ' (房主)'}
                </span>
                <span className={`ready-status ${player.ready ? 'ready' : ''}`}>
                  {player.ready ? '✓ 已准备' : '等待中'}
                </span>
              </li>
            ))}
            {/* 空位 */}
            {Array(5 - (room?.players?.length || 0)).fill(0).map((_, i) => (
              <li key={`empty-${i}`} className="empty">
                <span className="seat">座位 {(room?.players?.length || 0) + i + 1}</span>
                <span className="name">空位 (AI填充)</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="room-actions">
          {!room?.players?.find(p => p.id === room?.players?.[mySeat]?.id)?.ready && (
            <button className="btn btn-primary" onClick={setReady}>
              准备
            </button>
          )}
          
          {isHost && (
            <button 
              className="btn btn-success"
              onClick={startGame}
            >
              开始游戏 {room?.players?.length < 5 && '(AI补位)'}
            </button>
          )}
          
          <button className="btn btn-outline" onClick={leaveRoom}>
            离开房间
          </button>
        </div>
      </motion.div>
    )
  }
  
  // 渲染游戏界面 - 使用与单人模式相同的布局
  const renderGameScreen = () => {
    return (
      <MultiplayerGameBoard
        room={room}
        roomId={roomId}
        mySeat={mySeat}
        myHand={myHand}
        gameState={gameState}
        playerName={playerName}
        playCards={playCards}
        pass={pass}
        toggleReveal={toggleReveal}
        restartGame={restartGame}
        onLeave={() => window.location.reload()}
      />
    )
  }
  
  // 根据状态渲染
  const renderContent = () => {
    switch (status) {
      case ROOM_STATUS.DISCONNECTED:
      case ROOM_STATUS.CONNECTING:
        return renderConnectScreen()
      case ROOM_STATUS.CONNECTED:
        return renderLobbyScreen()
      case ROOM_STATUS.IN_ROOM:
        return renderRoomScreen()
      case ROOM_STATUS.PLAYING:
        return renderGameScreen()
      default:
        return renderConnectScreen()
    }
  }
  
  // 游戏中不需要外层容器，直接渲染
  if (status === ROOM_STATUS.PLAYING) {
    return renderGameScreen()
  }
  
  return (
    <div className="multiplayer-container">
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </div>
  )
}

export default MultiplayerLobby

