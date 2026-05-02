'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { Footer } from '@/components/ui'
import { DemoNotificationTrigger } from '@/components/DemoNotificationTrigger'
import { SnowOverlay } from '@/components/ui/SnowOverlay'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isUniversity = pathname?.startsWith('/university')

  return (
    <div className="relative">
      {!isUniversity && <DemoNotificationTrigger />}
      {!isUniversity && <SnowOverlay />}
      {children}
      {!isUniversity && <Footer />}
      {!isUniversity && (
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            },
          }}
        />
      )}
    </div>
  )
}

