'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Save, 
  FileText,
  Eye,
  Edit,
  RefreshCw
} from 'lucide-react'

interface PageData {
  company: { title: string; content: string }
  terms: { title: string; content: string }
  privacy: { title: string; content: string }
}

interface PageManagementProps {
  pageData: PageData
}

export default function PageManagement({ pageData }: PageManagementProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<string | null>(null)

  const handleUpdatePage = async (pageType: string, title: string, content: string) => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    setSaving(pageType)
    
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ pageType, title, content })
      })

      if (response.ok) {
        alert('페이지가 성공적으로 업데이트되었습니다.')
      } else {
        throw new Error('페이지 업데이트에 실패했습니다.')
      }
    } catch (error) {
      console.error('페이지 업데이트 오류:', error)
      alert('페이지 업데이트 중 오류가 발생했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const getPageDisplayName = (key: string) => {
    switch (key) {
      case 'company': return '🏢 회사 소개'
      case 'terms': return '📜 이용약관'
      case 'privacy': return '🔒 개인정보처리방침'
      default: return key
    }
  }

  const getPageDescription = (key: string) => {
    switch (key) {
      case 'company': return '회사 정보와 비전을 소개하는 페이지입니다.'
      case 'terms': return '서비스 이용 약관을 정의하는 중요한 법적 문서입니다.'
      case 'privacy': return '개인정보 수집 및 처리 방침을 명시하는 문서입니다.'
      default: return ''
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">📄 페이지 관리</h2>
          <p className="text-slate-400 mt-1">정적 페이지의 내용을 편집할 수 있습니다.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(pageData).map(([key, data]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * Object.keys(pageData).indexOf(key) }}
          >
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {getPageDisplayName(key)}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{getPageDescription(key)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setPreviewMode(previewMode === key ? null : key)}
                      className={`${previewMode === key ? 'bg-cyan-600' : 'bg-cyan-500'} hover:bg-cyan-400`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {previewMode === key ? '편집' : '미리보기'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {previewMode === key ? (
                  // 미리보기 모드
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-lg text-gray-900">
                      <h1 className="text-2xl font-bold mb-4">{data.title}</h1>
                      <div className="prose max-w-none">
                        {data.content.split('\n').map((paragraph: string, index: number) => (
                          <p key={index} className="mb-3">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 편집 모드
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        페이지 제목
                      </label>
                      <Input
                        placeholder="페이지 제목을 입력하세요"
                        defaultValue={data.title}
                        className="bg-slate-800 border-slate-700 text-slate-200"
                        id={`${key}-title`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        페이지 내용
                      </label>
                      <textarea
                        placeholder="페이지 내용을 입력하세요"
                        defaultValue={data.content}
                        className="w-full p-4 bg-slate-800 border border-slate-700 rounded-md text-slate-200 min-h-[300px] font-mono text-sm leading-relaxed resize-y"
                        id={`${key}-content`}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        💡 줄바꿈은 자동으로 문단으로 변환됩니다. HTML 태그를 사용할 수 있습니다.
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => {
                        const titleEl = document.getElementById(`${key}-title`) as HTMLInputElement
                        const contentEl = document.getElementById(`${key}-content`) as HTMLTextAreaElement
                        handleUpdatePage(key, titleEl.value, contentEl.value)
                      }}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      disabled={saving === key}
                    >
                      {saving === key ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving === key ? '저장 중...' : '변경사항 저장'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 페이지 관리 팁 */}
      <Card className="bg-cyan-500/10 border-cyan-500/40">
        <CardHeader>
          <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            💡 페이지 관리 팁
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>미리보기 기능을 활용하여 변경사항을 저장하기 전에 확인하세요.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>이용약관과 개인정보처리방침은 법적 효력이 있으므로 신중하게 수정하세요.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>HTML 태그를 사용하여 더 풍부한 서식을 적용할 수 있습니다.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>변경사항은 즉시 반영되므로 백업을 위해 중요한 내용은 별도로 보관하세요.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최근 수정 내역 */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            📊 페이지 현황
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(pageData).map(([key, data]) => (
              <div key={key} className="bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-2">{getPageDisplayName(key)}</h4>
                <div className="space-y-1 text-sm text-slate-400">
                  <p>제목 길이: {data.title.length}자</p>
                  <p>내용 길이: {data.content.length}자</p>
                  <p>문단 수: {data.content.split('\n').filter((p: string) => p.trim()).length}개</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
