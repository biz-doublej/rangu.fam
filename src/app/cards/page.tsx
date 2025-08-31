'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, Hammer, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { CardDropWidget } from '@/components/ui/CardDropWidget'
import { CardCollection } from '@/components/ui/CardCollection'
import { AdvancedCardCrafting } from '@/components/ui/AdvancedCardCrafting'

export default function CardsPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [activeTab, setActiveTab] = useState<'drop' | 'inventory' | 'crafting'>('drop')

  const tabs = [
    { id: 'drop', label: '카드 뽑기', icon: Package, description: '무제한 무료 카드 드랍' },
    { id: 'inventory', label: '컬렉션', icon: Sparkles, description: '카드 보관함 컬렉션' },
    { id: 'crafting', label: '조합', icon: Hammer, description: '프레스티지 카드 제작' }
  ]

  return (
    <div className="min-h-screen" suppressHydrationWarning>
      {/* 헤더 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 py-3" suppressHydrationWarning>
          <div className="flex items-center justify-between">
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              suppressHydrationWarning
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <h1 className="text-xl font-bold text-gradient">랑구 카드 드랍</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12" suppressHydrationWarning>
        <div className="max-w-6xl mx-auto p-6" suppressHydrationWarning>
          {/* 인트로 섹션 */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              🎴 랑구 카드 드랍
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              랑구 친구들을 카드로 소장해보세요. 무제한 무료 드랍으로 희귀한 카드를 수집하고,
              조합을 통해 프레스티지 카드를 만들어보세요!
            </p>
          </motion.div>

          {/* 로그인 필요 안내 */}
          {!isLoggedIn && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card variant="glass">
                <CardContent className="py-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    🔒 로그인이 필요합니다
                  </h3>
                  <p className="text-gray-500 mb-4">
                    카드 드랍 시스템을 이용하려면 로그인해주세요
                  </p>
                  <Button
                    variant="glass"
                    onClick={() => router.push('/login')}
                  >
                    로그인하기
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 탭 네비게이션 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'border-primary-300 bg-primary-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-25'
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activeTab === tab.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <tab.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className={`font-semibold ${
                        activeTab === tab.id ? 'text-primary-700' : 'text-gray-800'
                      }`}>
                        {tab.label}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tab.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* 탭 컨텐츠 */}
          <motion.div
            className="min-h-[600px]"
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {activeTab === 'drop' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <CardDropWidget userId={user?.id} />
                </div>
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-gray-800">카드 드랍 가이드</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-800">📦 카드 종류</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">년도 카드 (베이직)</span>
                              <span className="font-medium text-gray-500">50%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">스페셜 카드 (희귀)</span>
                              <span className="font-medium text-blue-600">30%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">시그니처 카드 (에픽)</span>
                              <span className="font-medium text-pink-600">10%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">재료 카드 (조합용)</span>
                              <span className="font-medium text-green-600">10%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-800">⭐ 특별 카드</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>• 년도별 멤버 카드 (상반기/하반기)</p>
                            <p>• 단체 카드 (결성, 1주년, 2주년)</p>
                            <p>• 프레스티지 카드 (조합으로만 획득)</p>
                            <p>• 재료 카드로 무한 조합 가능</p>
                          </div>
                        </div>
                      </div>
                      
                                              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                          <h4 className="font-medium text-purple-800 mb-2">💡 팁</h4>
                          <p className="text-sm text-purple-700">
                            무제한 무료 드랍으로 원하는 만큼 카드를 뽑고, 재료 카드를 모아서 프레스티지 카드를 조합해보세요!
                            희귀한 프레스티지 카드는 조합으로만 획득할 수 있습니다.
                          </p>
                        </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <CardCollection userId={user?.id} />
            )}

            {activeTab === 'crafting' && (
              <AdvancedCardCrafting userId={user?.id} />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
