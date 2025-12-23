'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link2, Users, ShieldCheck, Activity, UserCheck2, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Member } from '@/types'

interface AccountSession {
  discordId: string
  discordUsername?: string
  discordAvatar?: string
  memberId?: string
  memberLinkedAt?: string
  memberProfile?: Member
  wikiUsername?: string
  wikiLinkedAt?: string
}

export default function AccountSettingsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [accountSession, setAccountSession] = useState<AccountSession | null>(null)
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [wikiCredentials, setWikiCredentials] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(true)
  const [linkingMember, setLinkingMember] = useState(false)
  const [linkingWiki, setLinkingWiki] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [memberRes, sessionRes] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/account/session'),
        ])

        if (memberRes.ok) {
          const memberData = await memberRes.json()
          setMembers(memberData)
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          setAccountSession(sessionData.data)
          setSelectedMember(sessionData.data.memberId || '')
        }
      } catch (error) {
        console.error('계정 정보 초기화 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/account/session')
      if (response.ok) {
        const data = await response.json()
        setAccountSession(data.data)
        setSelectedMember(data.data.memberId || '')
      }
    } catch (error) {
      console.error('세션 새로고침 실패:', error)
    }
  }

  const handleLinkMember = async () => {
    if (!accountSession) {
      toast.error('먼저 디스코드로 로그인해주세요.')
      return
    }

    if (!selectedMember) {
      toast.error('연결할 멤버를 선택해주세요.')
      return
    }

    setLinkingMember(true)
    try {
      const response = await fetch('/api/account/link-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId: selectedMember }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || '멤버 연동에 실패했습니다.')
        return
      }

      toast.success('멤버 계정과 연결되었습니다.')
      await refreshSession()
    } catch (error) {
      console.error('멤버 연동 오류:', error)
      toast.error('멤버 연동 중 오류가 발생했습니다.')
    } finally {
      setLinkingMember(false)
    }
  }

  const handleLinkWiki = async () => {
    if (!accountSession) {
      toast.error('먼저 디스코드로 로그인해주세요.')
      return
    }

    if (!wikiCredentials.username || !wikiCredentials.password) {
      toast.error('위키 아이디와 비밀번호를 입력해주세요.')
      return
    }

    setLinkingWiki(true)
    try {
      const response = await fetch('/api/wiki/auth/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wikiCredentials),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || '위키 계정 연동에 실패했습니다.')
        return
      }

      toast.success('위키 계정이 디스코드와 연결되었습니다.')
      setWikiCredentials({ username: '', password: '' })
      await refreshSession()
    } catch (error) {
      console.error('위키 연동 오류:', error)
      toast.error('위키 계정 연동 중 오류가 발생했습니다.')
    } finally {
      setLinkingWiki(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        계정 정보를 불러오는 중입니다...
      </div>
    )
  }

  const infoBlocks = [
    {
      label: '연결된 멤버',
      value: accountSession?.memberProfile?.name || '아직 연결되지 않았습니다',
    },
    {
      label: '연결된 위키 계정',
      value: accountSession?.wikiUsername || '아직 연결되지 않았습니다',
    },
    {
      label: '디스코드 ID',
      value: accountSession?.discordUsername || '로그인 필요',
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050918] via-[#060312] to-[#020205]" />
      <div className="absolute -top-32 right-0 w-[32rem] h-[32rem] bg-primary-500/30 blur-[180px]" />
      <div className="absolute bottom-[-10rem] left-[-6rem] w-[28rem] h-[28rem] bg-purple-600/20 blur-[160px]" />

      <div className="relative z-10 px-4 py-14 lg:py-16">
        <div className="max-w-5xl mx-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Account Center</p>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">계정 설정</h1>
              <p className="text-white/70 leading-relaxed">
                Discord 인증과 Rangu · 이랑위키 계정을 한 곳에서 관리하세요. 계정 정보를 연결하면
                사이트 전체에서 권한과 상태가 자동으로 적용됩니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
              {infoBlocks.map((block) => (
                <div
                  key={block.label}
                  className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm min-w-[8.5rem]"
                >
                  <p className="text-white/60">{block.label}</p>
                  <p className="font-semibold text-white mt-0.5 break-words">{block.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-white/5 border-white/10 text-white shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Link2 className="w-4 h-4 text-primary-200" />
                    <h2 className="text-lg font-semibold">디스코드 연결 상태</h2>
                  </div>
                  <span className="flex items-center space-x-1 text-xs text-white/70 border border-white/10 px-2 py-1 rounded-full">
                    <Activity className="w-3 h-3" />
                    <span>{accountSession ? '연결됨' : '연결 해제'}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/80">
                <p>
                  {accountSession
                    ? `${accountSession.discordUsername || 'Discord 사용자'}님의 계정이 연결되어 있습니다.`
                    : 'Discord 계정을 먼저 인증하면 상태가 표시됩니다.'}
                </p>

                <div className="grid gap-3">
                  <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                    <p className="text-xs text-white/60 mb-1">연결된 멤버</p>
                    <p className="text-base font-semibold">
                      {accountSession?.memberProfile?.name || accountSession?.discordUsername || '연결되지 않음'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                    <p className="text-xs text-white/60 mb-1">연결된 위키 계정</p>
                    <p className="text-base font-semibold">
                      {accountSession?.wikiUsername || '연결되지 않음'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-white/5 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-200" />
                    <h3 className="text-lg font-semibold text-white">Rangu 멤버 연결</h3>
                  </div>
                  <span className="text-xs text-white/60 flex items-center space-x-1">
                    <UserCheck2 className="w-3 h-3" />
                    <span>멤버 권한 동기화</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <p>
                  Discord 계정을 팀 멤버 프로필과 연결하면 활동 기록, 권한, 상태 등이 사이트 전체에
                  자동으로 반영됩니다.
                </p>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">연결할 멤버 선택</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                  >
                    <option value="">멤버를 선택하세요</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  loading={linkingMember}
                  disabled={!accountSession}
                  onClick={handleLinkMember}
                >
                  멤버 연결하기
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Card className="bg-black/30 border-white/5 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <h3 className="text-lg font-semibold text-white">이랑위키 계정 연동</h3>
                </div>
                <span className="text-xs flex items-center space-x-1 text-emerald-100/80">
                  <Sparkles className="w-3 h-3" />
                  <span>보안 검증 후 연결</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-white/70 leading-relaxed">
                기존 위키 아이디와 비밀번호를 입력하면 Discord 계정과 연결됩니다. 비밀번호는 인증
                과정에서만 사용되고 저장되지 않습니다.
              </p>
              <Input
                label="위키 아이디 또는 이메일"
                type="text"
                value={wikiCredentials.username}
                onChange={(e) => setWikiCredentials({ ...wikiCredentials, username: e.target.value })}
                placeholder="wiki 사용자명"
              />
              <Input
                label="위키 비밀번호"
                type="password"
                value={wikiCredentials.password}
                onChange={(e) => setWikiCredentials({ ...wikiCredentials, password: e.target.value })}
                placeholder="비밀번호"
              />
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={linkingWiki}
                disabled={!accountSession}
                onClick={handleLinkWiki}
              >
                위키 계정 연동하기
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
