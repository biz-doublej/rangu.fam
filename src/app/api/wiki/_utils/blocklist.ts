import { NextRequest } from 'next/server'

const ipBlockSet: Set<string> = new Set()

export function getClientIp(req: NextRequest): string {
  const hdr = req.headers.get('x-forwarded-for') || ''
  const ip = hdr.split(',')[0].trim() || (req as any).ip || ''
  return ip
}

export function isIpBlocked(ip: string): boolean {
  if (!ip) return false
  return ipBlockSet.has(ip)
}

export function banIp(ip: string) {
  if (ip) ipBlockSet.add(ip)
}

export function unbanIp(ip: string) {
  if (ip) ipBlockSet.delete(ip)
}

export function listBannedIps(): string[] {
  return Array.from(ipBlockSet)
}


