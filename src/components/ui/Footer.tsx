'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Info, 
  FileText, 
  Shield, 
  Users, 
  Bell,
  ExternalLink
} from 'lucide-react'

const Footer: React.FC = () => {
  const companyInfo = [
    {
      icon: Info,
      label: '회사소개',
      href: '/about/company'
    },
    {
      icon: Bell,
      label: '공지사항',
      href: '/notices'
    },
    {
      icon: FileText,
      label: '이용약관',
      href: '/terms'
    },
    {
      icon: Shield,
      label: '개인정보처리방침',
      href: '/privacy'
    }
  ]

  const services = [
    {
      name: '랑구팸',
      description: '친구들의 특별한 온라인 공간',
      href: '/'
    },
    {
      name: '이랑위키',
      description: '지식과 정보의 공유 플랫폼',
      href: '/wiki'
    }
  ]

  return (
    <footer className="theme-surface">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="col-span-1 lg:col-span-2"
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-3">
                DoubleJ
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>미국의 DoubleJ 회사 산하로 운영되는 사이트입니다.</p>
                <p>랑구팸과 이랑위키를 관리합니다.</p>
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
              <p className="text-sm font-medium text-blue-400">
                Powered by DoubleJ
              </p>
            </div>
          </motion.div>

          {/* 서비스 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="font-semibold text-gray-200 mb-4">서비스</h4>
            <div className="space-y-3">
              {services.map((service, index) => (
                <motion.a
                  key={service.name}
                  href={service.href}
                  className="block group"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-xs text-gray-500">{service.description}</div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* 서비스 정보 링크 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="font-semibold text-gray-200 mb-4">서비스 정보</h4>
            <div className="space-y-3">
              {companyInfo.map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">{item.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* 저작권 정보 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div className="text-sm text-gray-500">
            ©2025 DoubleJ Biz. | All rights reserved
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Built with</span>
            <motion.span
              className="text-red-500"
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              ❤️
            </motion.span>
            <span>for our friendship</span>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

export default Footer
