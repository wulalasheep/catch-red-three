import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import Card from './Card'
import { useDragSelect } from '../hooks/useDragSelect'

const Hand = ({
  cards,
  selectedCards = [],
  onCardClick,
  disabled = false,
  faceDown = false,
  position = 'bottom',
  revealedCards = [],
  compact = false,
  onDragSelect = null
}) => {
  if (!cards || cards.length === 0) return null

  const handRef = useRef(null)
  const [cardPositions, setCardPositions] = useState(new Map())
  const [isReordering, setIsReordering] = useState(false)
  const [prevSelectedCards, setPrevSelectedCards] = useState([])
  const prevCardsLengthRef = useRef(cards.length)

  const isSelected = (card) => selectedCards.some(c => c.id === card.id)
  const isRevealed = (card) => revealedCards.some(c => c.id === card.id)

  // 检测手牌变化
  useEffect(() => {
    const currentLength = cards.length
    const prevLength = prevCardsLengthRef.current

    if (currentLength !== prevLength) {
      setIsReordering(true)
      const timer = setTimeout(() => setIsReordering(false), 400)
      prevCardsLengthRef.current = currentLength
      return () => clearTimeout(timer)
    }

    // 检测选中状态变化
    const selectedIds = selectedCards.map(c => c.id).sort()
    const prevSelectedIds = prevSelectedCards.map(c => c.id).sort()
    const hasSelectionChanged = selectedIds.join(',') !== prevSelectedIds.join(',')

    if (hasSelectionChanged) {
      setIsReordering(true)
      const timer = setTimeout(() => setIsReordering(false), 300)
      setPrevSelectedCards([...selectedCards])
      return () => clearTimeout(timer)
    }
  }, [cards.length, selectedCards, prevSelectedCards])

  // 拖拽选择逻辑
  const handleDragSelect = useCallback((rect) => {
    if (!onDragSelect || disabled || faceDown) return

    // 获取手牌容器位置
    const handRect = handRef.current?.getBoundingClientRect()
    if (!handRect) return

    // 计算哪些牌在选择区域内
    const selectedCardIds = []
    cardPositions.forEach((pos, cardId) => {
      // 将牌的位置转换为相对于选择矩形的坐标
      const cardCenterX = pos.x + pos.width / 2
      const cardCenterY = pos.y + pos.height / 2

      if (cardCenterX >= rect.left && cardCenterX <= rect.left + rect.width &&
          cardCenterY >= rect.top && cardCenterY <= rect.top + rect.height) {
        selectedCardIds.push(cardId)
      }
    })

    if (selectedCardIds.length > 0) {
      onDragSelect(selectedCardIds)
    }
  }, [onDragSelect, disabled, faceDown, cardPositions])

  const { isDragging, selectedRect, startDrag, updateDrag, endDrag, cancelDrag } = useDragSelect(
    handleDragSelect
  )

  // 鼠标/触摸事件处理
  const handlePointerDown = useCallback((e) => {
    if (disabled || faceDown || !onDragSelect) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    startDrag({ x, y })
  }, [disabled, faceDown, onDragSelect, startDrag])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    updateDrag({ x, y })
  }, [isDragging, updateDrag])

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      endDrag()
    }
  }, [isDragging, endDrag])

  // 记录牌的位置信息
  const updateCardPosition = useCallback((cardId, element) => {
    if (element) {
      const rect = element.getBoundingClientRect()
      setCardPositions(prev => new Map(prev).set(cardId, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }))
    }
  }, [])
  
  const getPositionClass = () => {
    switch (position) {
      case 'top': return 'hand-top'
      case 'left': return 'hand-left'
      case 'right': return 'hand-right'
      case 'bottom':
      default: return 'hand-bottom'
    }
  }
  
  const isVertical = position === 'left' || position === 'right'
  // AI玩家（faceDown）使用tiny尺寸，玩家使用normal尺寸
  const cardSize = faceDown ? 'tiny' : 'normal'
  
  // 计算玩家手牌的重叠间距
  const cardSpacing = useMemo(() => {
    if (faceDown) return 0
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const isLandscape = screenWidth > screenHeight
    const cardCount = cards.length
    
    // 根据屏幕方向和牌数计算卡牌间距
    // 卡牌宽度大约46px，紧凑排列
    const cardWidth = 46
    const availableWidth = isLandscape ? screenWidth - 180 : screenWidth - 30
    
    // 计算每张牌需要的间距（包括重叠）
    // 总宽度 = (cardCount - 1) * spacing + cardWidth
    // spacing = (availableWidth - cardWidth) / (cardCount - 1)
    if (cardCount <= 1) return cardWidth
    
    const idealSpacing = cardWidth * 0.55 // 理想情况下显示55%
    const maxTotalWidth = (cardCount - 1) * idealSpacing + cardWidth
    
    if (maxTotalWidth <= availableWidth) {
      return idealSpacing
    }
    
    // 需要压缩
    const minSpacing = cardWidth * 0.35 // 最少显示35%
    const calculatedSpacing = (availableWidth - cardWidth) / (cardCount - 1)
    return Math.max(minSpacing, calculatedSpacing)
  }, [cards.length, faceDown])
  
  // AI玩家的牌叠起来显示的间距 - tiny尺寸的牌重叠更多
  const getAICardStyle = (index) => {
    // tiny尺寸的牌(24x35)，大部分重叠，只露出一小部分
    const verticalOverlap = -30 // 竖直方向重叠，只露出约5px
    const horizontalOverlap = -20 // 水平方向重叠，只露出约4px
    if (isVertical) {
      return {
        marginTop: index === 0 ? 0 : verticalOverlap
      }
    } else {
      return {
        marginLeft: index === 0 ? 0 : horizontalOverlap
      }
    }
  }

  // 计算容器尺寸
  const containerStyle = useMemo(() => {
    if (faceDown) {
      return {
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center'
      }
    }
    return {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end'
    }
  }, [faceDown, isVertical])
  
  return (
    <div
      ref={handRef}
      className={`hand ${getPositionClass()} ${compact ? 'hand-compact' : ''} ${isDragging ? 'hand-dragging' : ''} ${isReordering ? 'hand-reordering' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelDrag}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      <div className="hand-cards" style={containerStyle}>
        {cards.map((card, index) => {
            const selected = isSelected(card)
            const style = faceDown
              ? { ...getAICardStyle(index), zIndex: index }
              : {
                  position: 'relative',
                  marginLeft: index === 0 ? 0 : -(46 - cardSpacing),
                  // 保持原有的层叠顺序，选中的牌不改变 z-index
                  zIndex: index
                }

            return (
              <motion.div
                key={card.id}
                ref={el => updateCardPosition(card.id, el)}
                className={`hand-card-wrapper ${selected ? 'selected' : ''}`}
                style={style}
                initial={false}
                animate={{
                  y: selected ? -12 : 0
                }}
                transition={{
                  type: "tween",
                  duration: 0.15
                }}
              >
                <Card
                  card={card}
                  selected={selected}
                  onClick={onCardClick}
                  disabled={disabled || isDragging}
                  faceDown={faceDown}
                  size={cardSize}
                  revealed={isRevealed(card)}
                />
              </motion.div>
            )
          })}

        {/* 拖拽选择覆盖层 */}
        {isDragging && selectedRect && (
          <div
            className="hand-drag-overlay"
            style={{
              position: 'absolute',
              left: selectedRect.left,
              top: selectedRect.top,
              width: selectedRect.width,
              height: selectedRect.height,
              background: 'rgba(241, 196, 15, 0.3)',
              border: '2px solid var(--accent)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Hand
