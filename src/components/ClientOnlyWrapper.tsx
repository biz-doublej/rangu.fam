'use client'

import React from 'react'
import { useClientOnly } from '@/hooks/useClientOnly'

/**
 * Component wrapper that prevents hydration issues
 */
export function ClientOnlyWrapper({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const isClient = useClientOnly()
  
  if (!isClient) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}