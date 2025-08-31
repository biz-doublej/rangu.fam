/**
 * Development helpers to suppress expected errors and warnings
 */

export function suppressExpectedErrors() {
  if (typeof window === 'undefined') return

  // Store original console methods
  const originalError = console.error
  const originalWarn = console.warn

  // Override console.error to filter out expected errors
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    
    // Suppress expected 401 errors from auth checks
    if (message.includes('401') && message.includes('/api/wiki/auth/me')) {
      return // Don't log this expected error
    }
    
    // Suppress hydration warnings from browser extensions
    if (message.includes('bis_skin_checked') || 
        message.includes('Extra attributes from the server')) {
      return // Don't log browser extension hydration warnings
    }
    
    // Log all other errors normally
    originalError.apply(console, args)
  }

  // Override console.warn to filter out expected warnings
  console.warn = (...args: any[]) => {
    const message = args.join(' ')
    
    // Suppress hydration warnings
    if (message.includes('Warning: Extra attributes from the server')) {
      return // Don't log hydration warnings from browser extensions
    }
    
    // Log all other warnings normally
    originalWarn.apply(console, args)
  }

  // Suppress React DevTools hydration warnings for browser extensions
  if (process.env.NODE_ENV === 'development') {
    const originalConsoleError = window.console.error
    window.console.error = function(...args) {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Warning: Extra attributes from the server') ||
         args[0].includes('bis_skin_checked'))
      ) {
        return
      }
      originalConsoleError.apply(this, args)
    }
  }
}

/**
 * Handle network errors gracefully
 */
export function handleNetworkError(error: any, context: string): boolean {
  // Return true if error was handled, false if it should be logged
  
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    console.debug(`Network error in ${context} (likely server not running):`, error.message)
    return true
  }
  
  if (error.status === 401 && context.includes('auth')) {
    console.debug(`Authentication required for ${context} (expected)`)
    return true
  }
  
  return false
}

/**
 * Improved fetch wrapper with better error handling
 */
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const response = await fetch(url, options)
    return response
  } catch (error) {
    if (handleNetworkError(error, `fetch ${url}`)) {
      return null
    }
    throw error
  }
}

/**
 * Initialize development helpers
 */
export function initDevHelpers() {
  if (process.env.NODE_ENV === 'development') {
    suppressExpectedErrors()
    
    // Add helpful debugging info
    console.info('🔧 Development mode: Expected errors/warnings are suppressed')
    console.info('💡 Tip: 401 errors on /api/wiki/auth/me are normal when not logged in')
  }
}