'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'

interface CalendarProps {
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  selectedDate?: Date
  className?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Calendar({
  events = [],
  onDateClick,
  onEventClick,
  selectedDate,
  className
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 달력 시작일과 끝일 (이전/다음 달 일부 포함)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay())
  
  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()))
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      
      if (event.allDay) {
        return isSameDay(eventStart, date) || 
               (date >= eventStart && date <= eventEnd)
      } else {
        return isSameDay(eventStart, date)
      }
    })
  }

  return (
    <div className={cn('glass-card p-6', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          className="p-2 rounded-lg glass-button hover:bg-primary-100"
          onClick={goToPreviousMonth}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </motion.button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-primary-700">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <p className="text-sm text-gray-500">
            {format(new Date(), 'yyyy년 M월 d일', { locale: ko })}
          </p>
        </div>

        <motion.button
          className="p-2 rounded-lg glass-button hover:bg-primary-100"
          onClick={goToNextMonth}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </motion.button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'p-3 text-center text-sm font-medium',
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        <AnimatePresence mode="wait">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <motion.div
                key={day.toISOString()}
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
              >
                <motion.button
                  className={cn(
                    'w-full h-20 p-1 rounded-lg text-left transition-all duration-200 relative overflow-hidden',
                    isCurrentMonth
                      ? 'text-gray-800 hover:bg-primary-50'
                      : 'text-gray-400 hover:bg-gray-50',
                    isSelected && 'bg-primary-500 text-white hover:bg-primary-600',
                    isCurrentDay && !isSelected && 'bg-warm-100 text-warm-800 ring-2 ring-warm-300',
                    dayEvents.length > 0 && !isSelected && 'bg-primary-50'
                  )}
                  onClick={() => onDateClick?.(day)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* 날짜 */}
                  <div className="font-medium text-sm mb-1">
                    {format(day, 'd')}
                  </div>

                  {/* 이벤트 표시 */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        className={cn(
                          'text-xs px-1 py-0.5 rounded text-white truncate',
                          event.color || 'bg-primary-500'
                        )}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: eventIndex * 0.1 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(event)
                        }}
                      >
                        {event.title}
                      </motion.div>
                    ))}
                    
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} 더보기
                      </div>
                    )}
                  </div>
                </motion.button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-glass">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-warm-300 rounded-full"></div>
              <span>오늘</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span>일정 있음</span>
            </div>
          </div>
          
          <div className="text-xs">
            총 {events.length}개의 일정
          </div>
        </div>
      </div>
    </div>
  )
} 