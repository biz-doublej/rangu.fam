'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Zap, Target } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from './Button'

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

  // 이전/다음 달을 포함한 렌더링 범위
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

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateClick?.(today)
  }

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach((event) => {
      const key = new Date(event.startDate).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(event)
    })
    return map
  }, [events])

  const getEventsForDate = (date: Date) => {
    const key = date.toDateString()
    if (eventsByDay[key]) return eventsByDay[key]

    // allDay 범위 이벤트 처리
    return events.filter((event) => {
      if (!event.allDay) return false
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      return date >= start && date <= end
    })
  }

  return (
    <div className={cn('rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur', className)}>
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <motion.button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-emerald-300/40"
            onClick={goToPreviousMonth}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <motion.button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-emerald-300/40"
            onClick={goToNextMonth}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100 flex items-center justify-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(currentDate, 'yyyy MMMM', { locale: ko })}
          </p>
          <h2 className="text-2xl font-bold text-white">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
            <Target className="h-3.5 w-3.5 text-emerald-200" />
            {format(new Date(), 'yyyy년 M월 d일', { locale: ko })}
          </span>
          <Button variant="glass" size="sm" onClick={goToToday} className="text-xs px-3 py-2">
            오늘로
          </Button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-2 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-semibold tracking-wide',
              index === 0 ? 'text-rose-300' : index === 6 ? 'text-sky-300' : 'text-slate-300'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="mt-3 grid grid-cols-7 gap-2">
        <AnimatePresence mode="wait">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.006 }}
              >
                <button
                  className={cn(
                    'group relative flex h-24 w-full flex-col rounded-2xl border border-white/5 bg-white/[0.04] p-2 text-left transition',
                    'hover:border-emerald-300/40 hover:bg-white/10',
                    !isCurrentMonth && 'opacity-50',
                    isSelected && 'border-emerald-300/80 bg-emerald-500/15 shadow-[0_10px_40px_-18px_rgba(16,185,129,0.6)]',
                    isCurrentDay && !isSelected && 'border-sky-300/60 bg-sky-500/10'
                  )}
                  onClick={() => onDateClick?.(day)}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-white">{format(day, 'd')}</span>
                    {isCurrentDay && (
                      <span className="rounded-full border border-sky-200/60 bg-sky-500/20 px-2 text-[11px] text-sky-100">
                        오늘
                      </span>
                    )}
                    {isSelected && (
                      <span className="rounded-full border border-emerald-200/60 bg-emerald-500/20 px-2 text-[11px] text-emerald-100">
                        선택
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'flex items-center gap-2 truncate rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-100',
                          event.color || 'bg-white/5'
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(event)
                        }}
                      >
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[11px] text-slate-400">+{dayEvents.length - 3} 더보기</span>
                    )}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 범례 / 상태 */}
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-sky-300" /> 오늘
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-400" /> 선택 날짜
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" /> 일정 있음
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-300" /> 총 {events.length}개 일정
        </div>
      </div>
    </div>
  )
}
