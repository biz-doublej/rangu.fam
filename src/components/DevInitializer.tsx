'use client'

import { useEffect } from 'react'

/**
 * Development helper component that initializes development-specific features
 * Only runs in development mode to suppress expected console errors/warnings
 */
export function DevInitializer() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    // Store original console methods
    const originalError = console.error
    const originalWarn = console.warn

    // Enhanced error filtering
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      
      // Suppress expected 401 errors from auth checks
      if ((message.includes('401') && message.includes('/api/wiki/auth/me')) ||
          (message.includes('GET') && message.includes('401') && message.includes('Unauthorized'))) {
        return
      }
      
      // Suppress all hydration warnings from browser extensions
      if (message.includes('bis_skin_checked') || 
          message.includes('Extra attributes from the server') ||
          message.includes('data-darkreader') ||
          message.includes('data-adblock') ||
          message.includes('Warning: Extra attributes from the server')) {
        return
      }
      
      // Suppress ObjectId cast errors (now resolved but may still appear briefly)
      if (message.includes('Cast to ObjectId failed') && message.includes('jaewon')) {
        console.debug('ObjectId cast error (expected during user lookup):', message)
        return
      }
      
      // Suppress Framer Motion hydration warnings
      if (message.includes('MotionComponent') && message.includes('bis_skin_checked')) {
        return
      }
      
      // Log all other errors normally
      originalError.apply(console, args)
    }

    // Enhanced warning filtering
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      
      // Suppress all hydration-related warnings
      if (message.includes('Warning: Extra attributes from the server') ||
          message.includes('bis_skin_checked') ||
          message.includes('data-darkreader') ||
          message.includes('Hydration') ||
          message.includes('useLayoutEffect does nothing on the server')) {
        return
      }
      
      // Log all other warnings normally
      originalWarn.apply(console, args)
    }

    // Suppress React DevTools hydration warnings
    const originalConsoleError = window.console.error
    window.console.error = function(...args) {
      const message = args.join(' ')
      
      if (message.includes('Warning: Extra attributes from the server') ||
          message.includes('bis_skin_checked') ||
          message.includes('data-darkreader')) {
        return
      }
      
      originalConsoleError.apply(this, args)
    }

    // Add helpful debugging info
    console.info('%c[DEV] Development Mode Active', 'color: #10B981; font-weight: bold')
    console.info('%c[DEV] Browser extension warnings are suppressed for better development experience', 'color: #6B7280')
    console.info('%c[DEV] 401 errors on /api/wiki/auth/me are normal when not logged in', 'color: #6B7280')
    console.info('%c[DEV] Card system now handles both usernames and ObjectIds automatically', 'color: #6B7280')
    console.info('%c[DEV] If you need to see suppressed warnings, check browser console filtering', 'color: #6B7280')

    // Cleanup function to restore original console methods
    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.console.error = originalConsoleError
    }
  }, [])

  // This component doesn't render anything
  return null
}