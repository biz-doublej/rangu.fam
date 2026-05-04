'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  FileText,
  Edit
} from 'lucide-react'

interface WikiSubmission {
  _id: string
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  targetTitle: string
  content: string
  author: string
  createdAt: string
  reason?: string
  editSummary?: string
}

interface DocumentManagementProps {
  submissions: WikiSubmission[]
  activeSubTab: string
  onSubmissionAction: (id: string, action: 'approve' | 'reject' | 'hold', reason?: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

export default function DocumentManagement({ 
  submissions, 
  activeSubTab, 
  onSubmissionAction, 
  searchTerm, 
  setSearchTerm 
}: DocumentManagementProps) {
  const filteredSubmissions = submissions
    .filter(s => activeSubTab === '' || s.status === activeSubTab)
    .filter(s => s.targetTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 s.author.toLowerCase().includes(searchTerm.toLowerCase()))

  const getTabTitle = () => {
    switch (activeSubTab) {
      case 'pending': return '⏳ 승인 대기 문서'
      case 'approved': return '✅ 승인된 문서'
      case 'rejected': return '❌ 불허된 문서'
      case 'onhold': return '⏸️ 보류된 문서'
      default: return '📄 모든 문서'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600 text-yellow-100'
      case 'approved': return 'bg-green-600 text-green-100'
      case 'rejected': return 'bg-red-600 text-red-100'
      case 'onhold': return 'bg-slate-700 text-slate-100'
      default: return 'bg-slate-700 text-slate-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '승인대기'
      case 'approved': return '승인됨'
      case 'rejected': return '불허됨'
      case 'onhold': return '보류'
      default: return status
    }
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="문서명 또는 작성자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-200 min-w-[300px]"
            />
          </div>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    문서 정보
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSubmissions.map((submission) => (
                  <motion.tr
                    key={submission._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-slate-200 truncate">{submission.targetTitle}</p>
                        {submission.editSummary && (
                          <p className="text-sm text-slate-400 truncate mt-1">{submission.editSummary}</p>
                        )}
                        {submission.reason && (
                          <p className="text-sm text-red-400 truncate mt-1">사유: {submission.reason}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-white">
                            {submission.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-slate-300 font-medium">{submission.author}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        submission.type === 'create' ? 'bg-cyan-500 text-cyan-100' : 'bg-green-600 text-green-100'
                      }`}>
                        {submission.type === 'create' ? '🆕 새 문서' : '✏️ 편집'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                        {getStatusText(submission.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(submission.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onSubmissionAction(submission._id, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              title="승인"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const reason = prompt('불허 사유를 입력하세요:')
                                if (reason) onSubmissionAction(submission._id, 'reject', reason)
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              title="불허"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const reason = prompt('보류 사유를 입력하세요:')
                                if (reason) onSubmissionAction(submission._id, 'hold', reason)
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              title="보류"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            // 내용 미리보기 모달 구현 필요
                            alert(`문서 내용:\n\n${submission.content.substring(0, 200)}...`)
                          }}
                          className="bg-cyan-500 hover:bg-cyan-400 text-white"
                          title="미리보기"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">해당하는 문서가 없습니다.</p>
              {searchTerm && (
                <p className="text-slate-500 text-sm mt-2">
                  &quot;{searchTerm}&quot;에 대한 검색 결과가 없습니다.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-yellow-600/10 border-yellow-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {submissions.filter(s => s.status === 'pending').length}
            </p>
            <p className="text-yellow-300 text-sm">승인 대기</p>
          </CardContent>
        </Card>
        <Card className="bg-green-600/10 border-green-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {submissions.filter(s => s.status === 'approved').length}
            </p>
            <p className="text-green-300 text-sm">승인됨</p>
          </CardContent>
        </Card>
        <Card className="bg-red-600/10 border-red-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {submissions.filter(s => s.status === 'rejected').length}
            </p>
            <p className="text-red-300 text-sm">불허됨</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-700/10 border-slate-700/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-400">
              {submissions.filter(s => s.status === 'onhold').length}
            </p>
            <p className="text-slate-300 text-sm">보류</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
