import { NextRequest } from 'next/server'

export function getIpAddress(request: NextRequest): string {
  // Cloudflare 프록시(오렌지 구름)를 거치면 실제 방문자 IP 는 이 헤더에 온다
  const cloudflareIp = request.headers.get('cf-connecting-ip')
  if (cloudflareIp) return cloudflareIp.trim()

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

/** Cloudflare 가 붙여주는 국가 코드(cf-ipcountry) → "대한민국" 같은 이름. 없으면 null */
export function getCountryFromRequest(request: NextRequest): string | null {
  const code = request.headers.get('cf-ipcountry')?.trim().toUpperCase()
  if (!code || code === 'XX' || code === 'T1' || !/^[A-Z]{2}$/.test(code)) return null
  try {
    return new Intl.DisplayNames(['ko'], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
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