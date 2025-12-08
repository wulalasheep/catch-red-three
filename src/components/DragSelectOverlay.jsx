import React from 'react'
import { motion } from 'framer-motion'

const DragSelectOverlay = ({ selectedRect, isVisible }) => {
  if (!isVisible || !selectedRect) return null

  return (
    <motion.div
      className="drag-select-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="drag-select-rect"
        style={{
          left: selectedRect.left,
          top: selectedRect.top,
          width: selectedRect.width,
          height: selectedRect.height
        }}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 0.8 }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  )
}

export default DragSelectOverlay


