"use client"

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const flakes = Array.from({ length: 70 }).map((_, index) => ({
  id: index,
  delay: (index % 14) * -1.2,
  duration: 12 + (index % 6),
  size: 3 + (index % 4),
  left: (index * 13) % 100,
  layer: index % 3,
}))

export function SnowOverlay() {
  const { theme } = useTheme()
  if (theme !== 'christmas') return null

  return (
    <div className="snow-overlay" aria-hidden>
      {flakes.map(flake => (
        <span
          key={flake.id}
          className={`snowflake snowflake-layer-${flake.layer}`}
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
          }}
        />
      ))}
      <div className="snow-bank" />
    </div>
  )
}
