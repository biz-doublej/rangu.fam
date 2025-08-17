'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  skill: string
  level: number
  category: string
  color?: string
  showPercentage?: boolean
  animated?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  skill, 
  level, 
  category, 
  color = '#3b82f6',
  showPercentage = true,
  animated = true 
}) => {
  // 카테고리별 색상
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case '역사학':
        return '#8b5cf6' // purple
      case '교육학':
        return '#10b981' // green
      case '심리학':
        return '#f59e0b' // yellow
      default:
        return '#3b82f6' // blue
    }
  }

  const barColor = color === '#3b82f6' ? getCategoryColor(category) : color

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-medium text-gray-800 dark:text-gray-200">{skill}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{category}</p>
        </div>
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {level}%
          </span>
        )}
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ backgroundColor: barColor }}
          initial={animated ? { width: 0 } : { width: `${level}%` }}
          animate={{ width: `${level}%` }}
          transition={animated ? { duration: 1.5, ease: "easeOut", delay: 0.2 } : {}}
        >
          {animated && (
            <motion.div
              className="absolute inset-0 bg-white/30"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}

interface SkillsProgressProps {
  skills: Array<{
    name: string
    level: number
    category: string
  }>
  title?: string
  animated?: boolean
}

export const SkillsProgress: React.FC<SkillsProgressProps> = ({ 
  skills, 
  title = "스킬", 
  animated = true 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
        {title}
      </h3>
      
      {skills.map((skill, index) => (
        <motion.div
          key={skill.name}
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={animated ? { duration: 0.5, delay: index * 0.1 } : {}}
        >
          <ProgressBar
            skill={skill.name}
            level={skill.level}
            category={skill.category}
            animated={animated}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default ProgressBar