import { useState, useCallback, useRef } from 'react'

export const useDragSelect = (onSelect, onPlay) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [selectedRect, setSelectedRect] = useState(null)
  const dragTimeoutRef = useRef(null)

  // 开始拖拽
  const startDrag = useCallback((startPos) => {
    setDragStart(startPos)
    setDragEnd(startPos)
    setIsDragging(true)
    setSelectedRect(null)

    // 清除之前的定时器
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }
  }, [])

  // 更新拖拽
  const updateDrag = useCallback((currentPos) => {
    if (!isDragging) return

    setDragEnd(currentPos)

    // 计算选择矩形
    const left = Math.min(dragStart.x, currentPos.x)
    const top = Math.min(dragStart.y, currentPos.y)
    const width = Math.abs(currentPos.x - dragStart.x)
    const height = Math.abs(currentPos.y - dragStart.y)

    setSelectedRect({ left, top, width, height })
  }, [isDragging, dragStart])

  // 结束拖拽
  const endDrag = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // 如果拖拽距离很小，当作点击
    if (dragStart && dragEnd) {
      const distance = Math.sqrt(
        Math.pow(dragEnd.x - dragStart.x, 2) +
        Math.pow(dragEnd.y - dragStart.y, 2)
      )

      if (distance < 10) {
        // 认为是点击，不执行选择
        setSelectedRect(null)
        setDragStart(null)
        setDragEnd(null)
        return
      }
    }

    // 延迟执行选择，让视觉效果显示
    dragTimeoutRef.current = setTimeout(() => {
      if (onSelect && selectedRect) {
        onSelect(selectedRect)
      }
      setSelectedRect(null)
      setDragStart(null)
      setDragEnd(null)
    }, 200)

  }, [isDragging, dragStart, dragEnd, selectedRect, onSelect])

  // 取消拖拽
  const cancelDrag = useCallback(() => {
    setIsDragging(false)
    setSelectedRect(null)
    setDragStart(null)
    setDragEnd(null)

    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }
  }, [])

  return {
    isDragging,
    selectedRect,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag
  }
}


