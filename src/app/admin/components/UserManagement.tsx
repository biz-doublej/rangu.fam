'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  AlertTriangle, 
  Ban, 
  Unlock,
  Users,
  Shield,
  UserX,
  Mail
} from 'lucide-react'

interface WikiUser {
  _id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastActive?: string
  banStatus?: {
    isBanned: boolean
    reason: string
    bannedUntil?: string
  }
}

interface UserManagementProps {
  users: WikiUser[]
  activeSubTab: string
  onUserAction: (id: string, action: 'ban' | 'unban' | 'warn', data?: any) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

export default function UserManagement({ 
  users, 
  activeSubTab, 
  onUserAction, 
  searchTerm, 
  setSearchTerm 
}: UserManagementProps) {
  const filteredUsers = users
    .filter(u => {
      if (activeSubTab === 'banned') return u.banStatus?.isBanned
      if (activeSubTab === 'userlist') return true
      return true
    })
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 u.email.toLowerCase().includes(searchTerm.toLowerCase()))

  const getTabTitle = () => {
    switch (activeSubTab) {
      case 'userlist': return '👥 사용자 목록'
      case 'banned': return '🚫 차단된 사용자'
      case 'roles': return '🛡️ 권한 관리'
      default: return '👤 사용자 관리'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600 text-red-100'
      case 'moderator': return 'bg-yellow-600 text-yellow-100'
      case 'editor': return 'bg-blue-600 text-blue-100'
      default: return 'bg-gray-600 text-gray-100'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'moderator': return '운영자'
      case 'editor': return '편집자'
      default: return '일반'
    }
  }

  if (activeSubTab === 'roles') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-bold text-white">{getTabTitle()}</h2>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <h3 className="text-xl font-bold text-gray-200">권한 체계</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-red-600/10 border-red-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      <span className="font-semibold text-red-400">관리자</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 모든 기능 접근</li>
                      <li>• 사용자 관리</li>
                      <li>• 시스템 설정</li>
                      <li>• 권한 부여</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-600/10 border-yellow-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-yellow-400">운영자</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 문서 승인/불허</li>
                      <li>• 사용자 경고/차단</li>
                      <li>• 토론 중재</li>
                      <li>• 문서 보호</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-600/10 border-blue-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <span className="font-semibold text-blue-400">편집자</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 문서 직접 편집</li>
                      <li>• 승인 없이 수정</li>
                      <li>• 파일 업로드</li>
                      <li>• 토론 참여</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-600/10 border-gray-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-400">일반</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 문서 편집 제안</li>
                      <li>• 승인 대기</li>
                      <li>• 토론 참여</li>
                      <li>• 기본 기능</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-200 mb-3">권한 변경</h4>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300 text-sm">
                    ⚠️ 권한 변경 기능은 개발 중입니다. 
                    현재는 데이터베이스에서 직접 수정하거나 별도의 관리 스크립트를 사용하세요.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{getTabTitle()}</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="사용자명 또는 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-gray-200 min-w-[300px]"
            />
          </div>
        </div>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                          <span className="text-sm font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-200">{user.username}</span>
                          {user.banStatus?.isBanned && (
                            <div className="flex items-center mt-1">
                              <Ban className="w-3 h-3 text-red-500 mr-1" />
                              <span className="text-xs text-red-400">차단됨</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-300">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.banStatus?.isBanned ? (
                        <div>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-red-100">
                            차단됨
                          </span>
                          <p className="text-xs text-red-400 mt-1 max-w-xs truncate">
                            {user.banStatus.reason}
                          </p>
                          {user.banStatus.bannedUntil && (
                            <p className="text-xs text-gray-500 mt-1">
                              해제: {new Date(user.banStatus.bannedUntil).toLocaleDateString('ko-KR')}
                            </p>
                          )}
                        </div>
                      ) : user.isActive ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-green-100">
                          활성
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-100">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.banStatus?.isBanned ? (
                          <Button
                            size="sm"
                            onClick={() => onUserAction(user._id, 'unban')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            title="차단 해제"
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                const reason = prompt('경고 사유를 입력하세요:')
                                if (reason) onUserAction(user._id, 'warn', { reason })
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              title="경고"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const reason = prompt('차단 사유를 입력하세요:')
                                const duration = prompt('차단 기간을 입력하세요 (일 단위, 영구차단은 0):')
                                if (reason && duration !== null) {
                                  onUserAction(user._id, 'ban', { 
                                    reason, 
                                    duration: parseInt(duration) || 0 
                                  })
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              title="차단"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">해당하는 사용자가 없습니다.</p>
              {searchTerm && (
                <p className="text-gray-500 text-sm mt-2">
                  "{searchTerm}"에 대한 검색 결과가 없습니다.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-600/10 border-blue-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {users.length}
            </p>
            <p className="text-blue-300 text-sm">총 사용자</p>
          </CardContent>
        </Card>
        <Card className="bg-green-600/10 border-green-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {users.filter(u => u.isActive && !u.banStatus?.isBanned).length}
            </p>
            <p className="text-green-300 text-sm">활성 사용자</p>
          </CardContent>
        </Card>
        <Card className="bg-red-600/10 border-red-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {users.filter(u => u.banStatus?.isBanned).length}
            </p>
            <p className="text-red-300 text-sm">차단된 사용자</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-600/10 border-yellow-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {users.filter(u => ['admin', 'moderator'].includes(u.role)).length}
            </p>
            <p className="text-yellow-300 text-sm">운영진</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
