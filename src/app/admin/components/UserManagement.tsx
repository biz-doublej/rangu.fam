'use client'

import React, { useMemo, useState } from 'react'
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
  ShieldCheck,
  Mail,
  Filter,
  RefreshCw,
  CheckCircle
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

const roleMap = {
  admin: { label: '관리자', color: 'from-red-500 to-red-600' },
  moderator: { label: '운영자', color: 'from-yellow-500 to-orange-500' },
  owner: { label: '소유자', color: 'from-purple-500 to-purple-600' },
  editor: { label: '편집자', color: 'from-blue-500 to-blue-600' },
  default: { label: '일반', color: 'from-gray-500 to-gray-600' }
}

const statusPill = (user: WikiUser) => {
  if (user.banStatus?.isBanned) {
    return { label: '차단됨', color: 'from-red-500 to-red-600', text: 'text-white' }
  }
  if (user.isActive) {
    return { label: '활성', color: 'from-green-500 to-green-600', text: 'text-white' }
  }
  return { label: '비활성', color: 'from-gray-500 to-gray-600', text: 'text-white' }
}

export default function UserManagement({ 
  users, 
  activeSubTab, 
  onUserAction, 
  searchTerm, 
  setSearchTerm 
}: UserManagementProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'banned' | 'staff'>('all')

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive && !u.banStatus?.isBanned).length,
    banned: users.filter(u => u.banStatus?.isBanned).length,
    staff: users.filter(u => ['admin', 'moderator', 'owner'].includes(u.role?.toLowerCase())).length
  }), [users])

  const filteredUsers = useMemo(() => users
    .filter(u => {
      if (activeSubTab === 'banned') return u.banStatus?.isBanned
      return true
    })
    .filter(u => {
      if (filterTab === 'active') return u.isActive && !u.banStatus?.isBanned
      if (filterTab === 'banned') return !!u.banStatus?.isBanned
      if (filterTab === 'staff') return ['admin', 'moderator', 'owner'].includes(u.role?.toLowerCase())
      return true
    })
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 u.email.toLowerCase().includes(searchTerm.toLowerCase())), [users, activeSubTab, filterTab, searchTerm])

  const getTabTitle = () => {
    switch (activeSubTab) {
      case 'userlist': return '👥 사용자 목록'
      case 'banned': return '🚫 차단된 사용자'
      case 'roles': return '🛡️ 권한 관리'
      default: return '👥 사용자 관리'
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
            <p className="text-sm text-gray-300">권한 변경 UI는 준비 중입니다. 현재는 관리자/운영자/편집자/일반으로 구분해 표시만 제공합니다.</p>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{getTabTitle()}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="h-4 w-4" />
            <span>총 {stats.total} · 활성 {stats.active} · 차단 {stats.banned} · 운영진 {stats.staff}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="사용자명 또는 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-gray-200 min-w-[260px]"
            />
          </div>
          {[
            { key: 'all', label: '전체', count: stats.total },
            { key: 'active', label: '활성', count: stats.active },
            { key: 'banned', label: '차단', count: stats.banned },
            { key: 'staff', label: '운영진', count: stats.staff },
          ].map(tab => (
            <Button
              key={tab.key}
              size="sm"
              variant={filterTab === tab.key ? 'primary' : 'ghost'}
              className="text-xs"
              onClick={() => setFilterTab(tab.key as any)}
            >
              <Filter className="h-3 w-3 mr-1" />
              {tab.label} ({tab.count})
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSearchTerm('')} className="text-gray-300">
            <RefreshCw className="h-4 w-4 mr-1" /> 초기화
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '총 사용자', value: stats.total, color: 'text-blue-300 bg-blue-500/10' },
          { label: '활성', value: stats.active, color: 'text-emerald-300 bg-emerald-500/10' },
          { label: '차단', value: stats.banned, color: 'text-rose-300 bg-rose-500/10' },
          { label: '운영진', value: stats.staff, color: 'text-amber-300 bg-amber-500/10' },
        ].map(card => (
          <Card key={card.label} className={`border-white/10 ${card.color}`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-80">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-850 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/70">
                <tr>
                  {['사용자', '이메일', '권한', '상태', '가입일', '작업'].map(head => (
                    <th key={head} className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => {
                  const roleInfo = roleMap[user.role?.toLowerCase() as keyof typeof roleMap] || roleMap.default
                  const status = statusPill(user)
                  return (
                    <motion.tr 
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            {['admin','owner','moderator'].includes(user.role?.toLowerCase()) && (
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/80 text-[10px] px-2 py-0.5 text-white">
                                {roleInfo.label}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-50">{user.username}</span>
                              {user.username === 'gabriel0727' && (
                                <span className="text-[11px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-bold">
                                  창작자
                                </span>
                              )}
                            </div>
                            {user.lastActive && (
                              <p className="text-xs text-gray-500">최근: {new Date(user.lastActive).toLocaleDateString('ko-KR')}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-gray-200">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${status.color}`}>
                          <CheckCircle className="h-4 w-4" />
                          {status.label}
                        </span>
                        {user.banStatus?.isBanned && user.banStatus.reason && (
                          <p className="text-xs text-rose-300 mt-1 max-w-xs truncate">{user.banStatus.reason}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">
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
                  )
                })}
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
    </motion.div>
  )
}
