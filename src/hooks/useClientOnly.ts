'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to prevent hydration mismatches by ensuring components only render on client
 * Useful for components that might be affected by browser extensions
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Hook to detect if browser extensions are present
 */
export function useBrowserExtensionDetection() {
  const [hasExtensions, setHasExtensions] = useState(false)

  useEffect(() => {
    // Check for common browser extension attributes
    const checkForExtensions = () => {
      const body = document.body
      const hasExtensionAttributes = 
        body.hasAttribute('bis_skin_checked') ||
        body.querySelector('[data-darkreader-inline-color]') !== null ||
        body.querySelector('[data-adblock-key]') !== null
      
      setHasExtensions(hasExtensionAttributes)
    }

    // Check immediately and after a short delay
    checkForExtensions()
    const timeout = setTimeout(checkForExtensions, 100)

    return () => clearTimeout(timeout)
  }, [])

  return hasExtensions
}