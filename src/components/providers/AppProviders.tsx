'use client'

import React from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { WikiAuthProvider } from '@/contexts/WikiAuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WikiAuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </WikiAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
