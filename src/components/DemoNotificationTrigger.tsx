'use client'

import { useEffect } from 'react'
import { useAuthNotifications } from '@/hooks/useAuthNotifications'
import { usePathname } from 'next/navigation'

export const DemoNotificationTrigger = () => {
  const { notifyInfo } = useAuthNotifications()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/university')) return

    // 환영 알림이 이미 표시되었는지 체크
    const hasShownWelcome = localStorage.getItem('welcome-notification-shown')
    
    if (!hasShownWelcome) {
      // Add a welcome notification after a short delay
      const timer = setTimeout(() => {
        notifyInfo(
          '환영합니다! 🎉',
          '랑구팸에 오신 것을 환영합니다. 알림 시스템이 활성화되었습니다.'
        )
        
        // 환영 알림을 표시했다고 기록
        localStorage.setItem('welcome-notification-shown', 'true')
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [pathname]) // 페이지 변경 시 재평가

  // This component renders nothing, it just triggers notifications
  return null
}
