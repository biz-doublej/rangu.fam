import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

// Tailwind CSS 클래스 병합 유틸리티
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 날짜 포맷팅 유틸리티
export const formatDate = {
  // 기본 날짜 형식 (2024년 1월 1일)
  standard: (date: Date) => format(date, 'yyyy년 M월 d일', { locale: ko }),
  
  // 짧은 날짜 형식 (2024.01.01)
  short: (date: Date) => format(date, 'yyyy.MM.dd'),
  
  // 시간 포함 (2024년 1월 1일 오후 2:30)
  withTime: (date: Date) => format(date, 'yyyy년 M월 d일 a h:mm', { locale: ko }),
  
  // 상대 시간 (3시간 전)
  relative: (date: Date) => formatDistanceToNow(date, { addSuffix: true, locale: ko }),
  
  // 시간만 (14:30)
  timeOnly: (date: Date) => format(date, 'HH:mm'),
  
  // 월/일만 (1/1)
  monthDay: (date: Date) => format(date, 'M/d'),
  
  // ISO 문자열
  iso: (date: Date) => date.toISOString(),
}

// 시간대별 시간 변환
export function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 문자열 단축
export function truncateString(str: string, length: number = 100): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

// 이메일 유효성 검사
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// URL 유효성 검사
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 랜덤 ID 생성
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 색상 팔레트
export const colors = {
  primary: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#0066cc',
    600: '#0052a3',
    700: '#003d7a',
    800: '#002952',
    900: '#001429',
  },
  warm: {
    50: '#fefcf9',
    100: '#fdf6ed',
    200: '#fbe9d3',
    300: '#f8d4a8',
    400: '#f4b96c',
    500: '#f09e30',
    600: '#e68900',
    700: '#c06d00',
    800: '#9b5600',
    900: '#7a4400',
  }
}

// 애니메이션 설정
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  },
  slideIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  }
}

// 로컬 스토리지 유틸리티
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.clear()
  }
}

// 디바운스 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 쓰로틀 함수
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
} 