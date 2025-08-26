'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui'
import { Shield, Lock, Eye, Database, AlertCircle, Mail, Settings } from 'lucide-react'

export default function PrivacyPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAdmin(true)
    }
  }, [])
  const sections = [
    {
      icon: Database,
      title: '개인정보의 수집 및 이용목적',
      content: `회사는 다음의 목적을 위하여 개인정보를 처리합니다:

1. 서비스 제공
   - 회원가입 및 관리
   - 서비스 이용에 따른 본인확인
   - 고객상담 및 민원처리
   - 공지사항 전달

2. 서비스 개선
   - 신규 서비스 개발 및 기존 서비스 개선
   - 서비스 이용 통계 분석
   - 맞춤형 서비스 제공`
    },
    {
      icon: Eye,
      title: '수집하는 개인정보의 항목',
      content: `회사는 다음과 같은 개인정보를 수집합니다:

1. 필수항목
   - 이름
   - 이메일 주소
   - 비밀번호

2. 선택항목
   - 프로필 사진
   - 소개글
   - 관심사 정보

3. 자동 수집 정보
   - IP 주소
   - 쿠키, 접속 로그
   - 서비스 이용 기록`
    },
    {
      icon: Lock,
      title: '개인정보의 보유 및 이용기간',
      content: `회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외 없이 해당 정보를 지체 없이 파기합니다:

1. 회원정보
   - 회원탈퇴 시까지 보유
   - 탈퇴 후 즉시 파기 (단, 관련 법령에 의한 보존 의무가 있는 경우 제외)

2. 서비스 이용 기록
   - 3년간 보관 후 파기

3. 민원처리 관련 기록
   - 3년간 보관 후 파기`
    },
    {
      icon: Shield,
      title: '개인정보의 제3자 제공',
      content: `회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:

1. 이용자들이 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우`
    },
    {
      icon: AlertCircle,
      title: '개인정보처리의 위탁',
      content: `회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:

1. 클라우드 서비스 제공업체
   - 위탁업무: 서버 호스팅 및 데이터 보관
   - 보유기간: 서비스 계약 기간

회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적∙관리적 보호조치, 재위탁 제한 등을 계약서 등 문서에 명시하고 있습니다.`
    },
    {
      icon: Lock,
      title: '개인정보의 안전성 확보조치',
      content: `회사는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다:

1. 개인정보 암호화
   - 개인정보는 암호화 등을 통해 안전하게 저장 및 관리

2. 접근통제
   - 개인정보처리시스템에 대한 접근권한의 부여, 변경, 말소를 통하여 개인정보에 대한 접근통제를 위하여 필요한 조치

3. 접속기록의 보관 및 위변조 방지
   - 개인정보처리시스템에 접속한 기록을 최소 1년간 보관, 관리하고 있으며, 접속기록이 위변조 및 도난, 분실되지 않도록 보안기능을 사용하고 있습니다.`
    }
  ]

  const rights = [
    {
      title: '개인정보 열람권',
      description: '본인의 개인정보 처리현황을 확인할 수 있습니다.'
    },
    {
      title: '개인정보 정정·삭제권',
      description: '개인정보가 잘못된 경우 수정이나 삭제를 요구할 수 있습니다.'
    },
    {
      title: '개인정보 처리정지권',
      description: '개인정보 처리에 대한 동의를 철회할 수 있습니다.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
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
            <h1 className="text-4xl font-bold text-white">개인정보처리방침</h1>
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
            이용자의 개인정보를 안전하게 보호합니다
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-blue-400 mt-1" />
                <div>
                  <h2 className="text-xl font-bold text-gray-200 mb-3">개인정보처리방침 안내</h2>
                  <div className="space-y-2 text-gray-400 text-sm leading-relaxed">
                    <p>
                      DoubleJ(이하 "회사")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 
                      개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.
                    </p>
                    <p>
                      <strong>시행일자: 2025년 1월 1일</strong>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy Policy Sections */}
        <div className="space-y-6 mb-12">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            >
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <h2 className="text-lg font-bold text-gray-200 flex items-center gap-3">
                    <section.icon className="w-6 h-6 text-blue-400" />
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

        {/* User Rights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mb-12"
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-3">
                <Eye className="w-6 h-6 text-blue-400" />
                정보주체의 권리·의무 및 그 행사방법
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm leading-relaxed">
                  이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rights.map((right, index) => (
                    <div key={right.title} className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-2">{right.title}</h4>
                      <p className="text-xs text-gray-400">{right.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <p className="text-sm text-gray-300">
                    <strong>권리 행사 방법:</strong> 개인정보 보호법 시행령 제41조에 따라 서면, 전화, 전자우편, 
                    모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-gray-200">개인정보 보호책임자</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 
                  피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                </p>
                
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-300">개인정보 보호책임자</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>담당부서: DoubleJ</p>
                      <p>담당자: Gabriel</p>
                      <p>이메일: doublej.biz01@gmail.com</p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-400 p-4 bg-gray-700 rounded-lg">
                  <p>
                    기타 개인정보침해 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• 개인정보침해신고센터 (privacy.go.kr / 국번없이 182)</li>
                    <li>• 개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
                    <li>• 대검찰청 사이버범죄수사단 (www.spo.go.kr / 국번없이 1301)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}