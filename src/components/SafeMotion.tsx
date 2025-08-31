'use client'

import { motion, MotionProps } from 'framer-motion'
import React from 'react'
import { useClientOnly } from '@/hooks/useClientOnly'

/**
 * Safe Motion components that prevent hydration mismatches
 */
interface SafeMotionProps extends MotionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function SafeMotionDiv({ children, fallback, className, ...props }: SafeMotionProps) {
  const isClient = useClientOnly()
  
  if (!isClient) {
    return (
      <div className={className} suppressHydrationWarning>
        {fallback || children}
      </div>
    )
  }
  
  return (
    <motion.div {...props} className={className} suppressHydrationWarning>
      {children}
    </motion.div>
  )
}

export function SafeMotionButton({ 
  children, 
  fallback, 
  className,
  onClick,
  ...props 
}: SafeMotionProps & { onClick?: () => void }) {
  const isClient = useClientOnly()
  
  if (!isClient) {
    return (
      <button className={className} onClick={onClick} suppressHydrationWarning>
        {fallback || children}
      </button>
    )
  }
  
  return (
    <motion.button {...props} className={className} onClick={onClick} suppressHydrationWarning>
      {children}
    </motion.button>
  )
}

/**
 * Higher-order component to wrap any component with hydration protection
 */
export function withHydrationProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const isClient = useClientOnly()
    
    if (!isClient) {
      return <div suppressHydrationWarning>Loading...</div>
    }
    
    return <Component {...props} />
  }
}