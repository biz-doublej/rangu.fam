'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui'
import { Building2, Globe, Users, Target, Award, Lightbulb, Settings } from 'lucide-react'

export default function CompanyPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAdmin(true)
    }
  }, [])
  const companyValues = [
    {
      icon: Target,
      title: '혁신',
      description: '끊임없는 기술 혁신을 통해 사용자에게 최고의 경험을 제공합니다.'
    },
    {
      icon: Users,
      title: '협력',
      description: '팀워크와 협업을 바탕으로 더 나은 서비스를 만들어갑니다.'
    },
    {
      icon: Award,
      title: '품질',
      description: '완벽한 품질의 서비스로 사용자의 신뢰를 얻습니다.'
    },
    {
      icon: Lightbulb,
      title: '창의성',
      description: '창의적인 아이디어로 새로운 가치를 창조합니다.'
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
            <h1 className="text-4xl font-bold text-white">회사소개</h1>
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
            DoubleJ Technology와 함께하는 디지털 혁신
          </p>
        </motion.div>

        {/* Company Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
                <h2 className="text-2xl font-bold text-gray-200">DoubleJ</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">회사 개요</h3>
                  <p className="text-gray-400 leading-relaxed">
                    DoubleJ는 미국에 본사를 둔 혁신적인 기술 회사입니다. 
                    우리는 사용자 중심의 디지털 플랫폼을 개발하여 사람들이 더 나은 온라인 경험을 
                    할 수 있도록 돕고 있습니다.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">주요 서비스</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-2">랑구팸 (Rangu.fam)</h4>
                      <p className="text-sm text-gray-400">
                        친구들을 위한 특별한 온라인 공간으로, 추억 공유와 소통을 위한 플랫폼입니다.
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-2">이랑위키</h4>
                      <p className="text-sm text-gray-400">
                        지식과 정보를 공유하는 협업형 위키 플랫폼으로, 체계적인 지식 관리를 지원합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Company Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-200 mb-6 text-center">핵심 가치</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {companyValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Card className="bg-gray-800 border-gray-700 h-full hover:bg-gray-750 hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gray-700 p-3 rounded-full">
                        <value.icon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-200 mb-2">{value.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="bg-gray-800 border-gray-700 text-center">
            <CardHeader>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Globe className="w-8 h-8 text-blue-400" />
                <h2 className="text-2xl font-bold text-gray-200">연락처</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-400">
                  더 자세한 정보가 필요하시거나 문의사항이 있으시면 언제든지 연락주세요.
                </p>
                <div className="bg-gray-700 p-4 inline-block rounded-lg">
                  <p className="text-sm text-gray-300">
                    이메일: doublej.biz01@gmail.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}