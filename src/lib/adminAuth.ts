import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-fam-admin-secret-key-2025'
// 모든 유저가 관리자 로그인 가능하도록 설정
const ADMIN_USERS = ['gabriel0727', 'admin', 'user', 'editor', 'manager'] // 기본 관리자 사용자 목록

export interface AdminUser {
  username: string
  role: 'admin'
  iat?: number
  exp?: number
}

// 관리자 토큰 생성
export function generateAdminToken(username: string): string {
  // 기본 관리자 목록에 있거나, user로 시작하는 사용자명 허용
  if (!ADMIN_USERS.includes(username) && !username.startsWith('user')) {
    throw new Error('관리자 권한이 없습니다')
  }
  
  return jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

// 토큰 검증
export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminUser
    
    if (!decoded.username) {
      return null
    }
    
    // 기본 관리자 목록에 있거나, user로 시작하는 사용자명 허용
    if (!ADMIN_USERS.includes(decoded.username) && !decoded.username.startsWith('user')) {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

// 요청에서 관리자 인증 확인
export function checkAdminAuth(request: NextRequest): AdminUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null
    
    const token = authHeader.replace('Bearer ', '')
    
    // 위키 기반 임시 토큰인 경우
    if (token === 'wiki-authenticated') {
      return { username: 'gabriel0727', role: 'admin' }
    }
    
    // 일반 관리자 토큰 검증
    const adminUser = verifyAdminToken(token)
    if (adminUser) return adminUser
    
    // JWT 토큰으로 위키 사용자 확인 시도
    try {
      const JWT_SECRET_WIKI = process.env.JWT_SECRET || 'rangu-wiki-secret'
      const decoded = jwt.verify(token, JWT_SECRET_WIKI) as any
      
      // 위키 사용자 토큰인 경우 gabriel0727로 인증
      if (decoded.username || decoded.userId) {
        return { username: 'gabriel0727', role: 'admin' }
      }
    } catch {
      // 위키 토큰 검증 실패
    }
    
    return null
  } catch {
    return null
  }
}

// 간단한 비밀번호 인증 (토큰 발급용)
export function validateAdminPassword(username: string, password: string): boolean {
  // 여러 관리자 계정 지원
  const validCredentials: { [key: string]: string } = {
    'gabriel0727': 'gabriel0727-admin',
    'admin': 'admin123',
    'user': 'user123',
    'editor': 'editor123',
    'manager': 'manager123'
  }
  
  // 사용자명이 ADMIN_USERS에 있고, 비밀번호가 맞는지 확인
  if (ADMIN_USERS.includes(username) && validCredentials[username] === password) {
    return true
  }
  
  // 만약 새로운 사용자라면, 간단한 패턴으로 접근 허용 (개발용)
  // 예: 사용자명이 'user'로 시작하고 비밀번호가 'pass'로 시작하는 경우
  if (username.startsWith('user') && password.startsWith('pass')) {
    return true
  }
  
  return false
}
