import { NextRequest } from 'next/server'

export function getIpAddress(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (remoteAddr) {
    return remoteAddr
  }
  
  // Fallback for local development
  return '127.0.0.1'
}

export function getLocationFromIp(ip: string): string {
  // For production, you could integrate with a service like ipapi.co
  // For now, return a simple location based on IP
  if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return '로컬 네트워크'
  }
  
  // You could add more sophisticated IP geolocation here
  return '알 수 없는 위치'
}

export function formatIpForDisplay(ip: string): string {
  if (ip === '127.0.0.1') {
    return '로컬호스트'
  }
  
  // Mask the last octet for privacy
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`
  }
  
  return ip
}