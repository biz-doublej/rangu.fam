'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui'
import { FileText, Calendar, AlertTriangle, Scale, Settings } from 'lucide-react'

export default function TermsPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAdmin(true)
    }
  }, [])
  const sections = [
    {
      title: '제1조 (목적)',
      content: `본 약관은 DoubleJ(이하 "회사")가 제공하는 랑구팸(Rangu.fam) 및 이랑위키 서비스(이하 "서비스")의 이용에 관한 조건 및 절차, 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.`
    },
    {
      title: '제2조 (정의)',
      content: `1. "서비스"라 함은 회사가 제공하는 랑구팸 및 이랑위키를 포함한 모든 온라인 서비스를 의미합니다.
2. "이용자"라 함은 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 의미합니다.
3. "회원"이라 함은 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.`
    },
    {
      title: '제3조 (약관의 효력 및 변경)',
      content: `1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.
2. 회사는 필요한 경우 관련법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.
3. 약관이 변경되는 경우, 회사는 변경사항을 시행일자 7일 이전부터 서비스 내 공지사항을 통해 공지합니다.`
    },
    {
      title: '제4조 (서비스 제공)',
      content: `1. 회사는 다음과 같은 서비스를 제공합니다:
   - 랑구팸: 개인 페이지, 음악 스테이션, 달력, 게임 등
   - 이랑위키: 위키 페이지 작성 및 편집, 검색 기능
2. 회사는 서비스 품질 향상을 위해 서비스의 내용을 변경할 수 있습니다.
3. 회사는 시스템 점검, 보수 또는 교체, 장애 대응 등의 경우 서비스 제공을 일시적으로 중단할 수 있습니다.`
    },
    {
      title: '제5조 (회원가입)',
      content: `1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 않는 한 회원으로 등록합니다:
   - 가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우
   - 등록 내용에 허위, 기재누락, 오기가 있는 경우`
    },
    {
      title: '제6조 (회원정보의 변경)',
      content: `1. 회원은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다.
2. 회원은 회원가입 시 기재한 사항이 변경되었을 경우 온라인으로 수정을 하거나 기타 방법으로 회사에 그 변경사항을 알려야 합니다.`
    },
    {
      title: '제7조 (개인정보보호)',
      content: `회사는 관련법령이 정하는 바에 따라 회원등록정보를 포함한 회원의 개인정보를 보호하기 위해 노력합니다. 회원의 개인정보보호에 관해서는 관련법령 및 회사가 정하는 "개인정보처리방침"에 정한 바에 의합니다.`
    },
    {
      title: '제8조 (회원의 의무)',
      content: `1. 회원은 다음 각호의 행위를 하여서는 안됩니다:
   - 신청 또는 변경시 허위내용의 등록
   - 타인의 정보도용
   - 회사가 게시한 정보의 변경
   - 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시
   - 회사 기타 제3자의 저작권 등 지적재산권에 대한 침해
   - 회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위`
    },
    {
      title: '제9조 (서비스 이용제한)',
      content: `회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.`
    },
    {
      title: '제10조 (면책조항)',
      content: `1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
3. 회사는 서비스에 표출된 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관해서는 책임을 지지 않습니다.`
    }
  ]

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      {/* Navigation Spacer */}
      <div className="h-20"></div>
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-bold text-white">이용약관</h1>
            <div className="flex-1 flex justify-end">
              {isAdmin && (
                <motion.button
                  onClick={() => window.location.href = '/admin'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings className="w-4 h-4" />
                  관리자 도구
                </motion.button>
              )}
            </div>
          </div>
          <p className="text-gray-300 text-lg">
            랑구팸 서비스 이용을 위한 약관 및 조건
          </p>
        </motion.div>

        {/* Last Updated Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-gray-200">최종 업데이트</span>
              </div>
              <p className="text-gray-400 text-sm">
                본 약관은 2025년 1월 1일부터 시행됩니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-300 mb-2">중요 안내</h3>
                  <p className="text-orange-200 text-sm leading-relaxed">
                    본 서비스를 이용하시기 전에 이용약관을 반드시 읽어보시고 동의하신 후 서비스를 이용해주시기 바랍니다. 
                    서비스 이용 시 본 약관에 동의한 것으로 간주됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            >
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    {section.title}
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="mt-12"
        >
          <Card className="bg-gray-800 border-gray-700 text-center">
            <CardHeader>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Scale className="w-8 h-8 text-blue-400" />
                <h2 className="text-xl font-bold text-gray-200">문의처</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-400">
                  이용약관에 대한 문의사항이나 의견이 있으시면 언제든지 연락주세요.
                </p>
                <div className="bg-gray-700 p-4 inline-block rounded-lg">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">
                      이메일: doublej.biz01@gmail.com
                    </p>
                    <p className="text-sm text-gray-300">
                      회사명: DoubleJ
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}