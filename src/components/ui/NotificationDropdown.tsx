'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  LogIn,
  LogOut,
  Edit,
  AlertTriangle,
  Info,
  CheckCircle,
  MapPin,
  Clock,
  Trash2,
  Check,
  ShieldAlert,
  Shield,
  Link as LinkIcon
} from 'lucide-react'
import { useNotifications, Notification } from '@/contexts/NotificationContext'
import { Button } from './Button'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NotificationDropdownProps {
  className?: string
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'wiki' | 'system' | 'unread'>('all')
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (notification: Notification) => {
    const { type, severity, category } = notification
    if (type === 'login') return <LogIn className="w-4 h-4 text-emerald-400" />
    if (type === 'logout') return <LogOut className="w-4 h-4 text-amber-400" />
    if (type === 'edit' || category === 'wiki') return <Edit className="w-4 h-4 text-sky-400" />
    if (type === 'warning' || severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    if (severity === 'critical' || type === 'alert' || category === 'security') return <ShieldAlert className="w-4 h-4 text-rose-400" />
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400" />
    if (type === 'info') return <Info className="w-4 h-4 text-blue-400" />
    return <Bell className="w-4 h-4 text-slate-300" />
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.isRead
      if (filter === 'wiki') return n.category === 'wiki' || n.type === 'edit'
      if (filter === 'system') return n.category === 'system' || n.type === 'login' || n.type === 'logout'
      return true
    })
  }, [notifications, filter])

  const counts = useMemo(() => {
    const wiki = notifications.filter((n) => n.category === 'wiki' || n.type === 'edit').length
    const system = notifications.filter((n) => n.category === 'system' || n.type === 'login' || n.type === 'logout').length
    const unread = notifications.filter((n) => !n.isRead).length
    return { wiki, system, unread }
  }, [notifications])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-200 hover:text-white"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-[26rem] max-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">이랑위키 알림</p>
                <h3 className="font-semibold text-white">Notification Center</h3>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-emerald-200 hover:text-emerald-100 text-xs"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    모두 읽음
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-rose-200 hover:text-rose-100 text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    모두 삭제
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-slate-200">
              {[
                { key: 'all', label: '전체', count: notifications.length },
                { key: 'wiki', label: '위키', count: counts.wiki },
                { key: 'system', label: '시스템', count: counts.system },
                { key: 'unread', label: '미확인', count: counts.unread },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 transition',
                    filter === key
                      ? 'border-emerald-300/60 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-emerald-200/50 hover:text-emerald-100'
                  )}
                >
                  <span>{label}</span>
                  <span className="text-[11px] text-emerald-100/80">{count}</span>
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-[20rem] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p>표시할 알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'cursor-pointer bg-white/[0.02] p-4 transition hover:bg-white/[0.06]',
                        !notification.isRead && 'border-l-2 border-emerald-300/70 bg-emerald-500/5'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex-shrink-0">
                          {getNotificationIcon(notification)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4
                              className={cn(
                                'text-sm font-semibold text-white',
                                !notification.isRead ? 'text-emerald-100' : 'text-slate-100'
                              )}
                            >
                              {notification.title}
                            </h4>
                            {notification.category && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                                {notification.category === 'wiki' ? '위키' : notification.category}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-200 line-clamp-2">{notification.message}</p>
                          {notification.data?.ipAddress && (
                            <div className="mt-1 flex items-center text-xs text-slate-400">
                              <MapPin className="mr-1 h-3 w-3" /> IP: {notification.data.ipAddress}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(notification.createdAt, {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </span>
                            {notification.link && (
                              <button
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-300/50 px-2 py-0.5 text-[11px] text-emerald-100 hover:border-emerald-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(notification.link as string)
                                  markAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                              >
                                <LinkIcon className="h-3 w-3" /> 열기
                              </button>
                            )}
                          </div>
                        </div>
                        {!notification.isRead && <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-300"></div>}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-400 hover:text-emerald-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                        >
                          읽음 처리
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-400 hover:text-rose-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
