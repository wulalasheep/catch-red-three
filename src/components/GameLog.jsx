import React, { useRef, useEffect } from 'react'

const GameLog = ({ gameLog, isOpen, onToggle }) => {
  const logContainerRef = useRef(null)
  
  // 倒序显示，自动滚动到顶部
  useEffect(() => {
    if (logContainerRef.current && isOpen) {
      logContainerRef.current.scrollTop = 0
    }
  }, [gameLog, isOpen])

  // 将记录倒序显示（最新的在最上面）
  const reversedLog = [...gameLog].reverse()
  
  return (
    <div className={`game-log-panel ${isOpen ? 'open' : ''}`}>
      <button className="game-log-toggle" onClick={onToggle}>
        {isOpen ? '隐藏记录' : '牌局记录'}
      </button>
      
      {isOpen && (
        <div className="game-log-content" ref={logContainerRef}>
          <div className="game-log-header">牌局流程记录</div>
          {gameLog.length === 0 ? (
            <div className="game-log-empty">暂无记录</div>
          ) : (
            <div className="game-log-list">
              {reversedLog.map((entry, index) => (
                <div
                  key={entry.step}
                  className={`game-log-entry ${entry.action === 'pass' ? 'pass' : 'play'}`}
                >
                  <span className="log-step">{gameLog.length - index}.</span>
                  <span className={`log-player player-${entry.playerId}`}>
                    {entry.player}
                  </span>
                  <span className="log-action">
                    {entry.action === 'pass' ? (
                      <span className="action-pass">不要</span>
                    ) : (
                      <span className="action-play">出牌: {entry.cardsStr}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GameLog

