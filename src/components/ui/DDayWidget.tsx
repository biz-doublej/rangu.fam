'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Target, Clock, GraduationCap } from 'lucide-react'

interface DDayWidgetProps {
  examInfo: {
    targetDate: string
    dDayDate: string
    school: string
    category: string
    attemptNumber: number
    status: string
    daysUntilExam: number
    daysUntilDeadline: number
    motto: string
  }
}

const DDayWidget: React.FC<DDayWidgetProps> = ({ examInfo }) => {
  const {
    dDayDate,
    targetDate,
    school,
    category,
    attemptNumber,
    status,
    daysUntilExam,
    daysUntilDeadline,
    motto
  } = examInfo

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 shadow-lg border border-blue-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500 rounded-lg">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            입시 D-Day
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{status}</p>
        </div>
      </div>

      {/* D-Day 카운터 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              D-Day까지
            </span>
          </div>
          <div className="text-2xl font-bold text-red-500">
            {daysUntilExam > 0 ? `D-${daysUntilExam}` : daysUntilExam === 0 ? 'D-Day!' : '완료'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(dDayDate).toLocaleDateString('ko-KR')}
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              입시 마감까지
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {daysUntilDeadline}일
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(targetDate).toLocaleDateString('ko-KR')}
          </div>
        </motion.div>
      </div>

      {/* 입시 정보 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">학교:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{school}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <GraduationCap className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">계열:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{category}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">시도:</span>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            {attemptNumber}번째 도전
          </span>
        </div>
      </div>

      {/* 응원 메시지 */}
      <motion.div
        className="mt-6 p-4 bg-blue-500 bg-opacity-10 rounded-lg border border-blue-200 dark:border-blue-800"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p className="text-center font-medium text-blue-700 dark:text-blue-300">
          {motto}
        </p>
      </motion.div>
    </div>
  )
}

export default DDayWidget
