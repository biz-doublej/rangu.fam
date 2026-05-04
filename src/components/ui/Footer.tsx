'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const Footer: React.FC = () => {
  // 회사 정책 페이지는 DoubleJ Account 의 공식 페이지로 직접 link (next.config redirect 도 동시에 작동).
  const companyInfo = [
    { label: '회사소개', href: 'https://accounts.doublej.app/company', external: true },
    { label: '이용약관', href: 'https://accounts.doublej.app/terms', external: true },
    { label: '개인정보처리방침', href: 'https://accounts.doublej.app/privacy', external: true },
  ]

  const services = [
    { name: '랑구팸', description: '친구 다섯의 종이 한 장', href: '/' },
    { name: '이랑위키', description: '우리만의 기록을 모으는 위키', href: '/wiki' },
    { name: '랑구대학', description: 'University 브랜드 랜딩', href: '/university' },
  ]

  return (
    <footer className="relative mt-12 border-t border-dashed border-ink-500/15 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* DoubleJ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <p className="caveat text-2xl text-coral-500">since 2020</p>
            <h3 className="display-han mt-1 text-2xl text-ink-500">DoubleJ</h3>
            <div className="mt-3 space-y-1.5 text-sm text-ink-300">
              <p>미국의 DoubleJ 회사 산하로 운영되는 사이트입니다.</p>
              <p>랑구팸과 이랑위키를 함께 관리합니다.</p>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink-500/15 bg-paper-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-500" />
              Powered by DoubleJ
            </div>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <p className="caveat text-lg text-coral-500">services</p>
            <h4 className="mt-1 text-sm font-bold uppercase tracking-[0.15em] text-ink-500">우리의 서비스</h4>
            <ul className="mt-3 space-y-3">
              {services.map((s) => (
                <li key={s.name}>
                  <a href={s.href} className="group block">
                    <p className="text-sm font-semibold text-ink-500 transition-colors group-hover:text-coral-500">
                      {s.name}
                    </p>
                    <p className="text-xs text-ink-300">{s.description}</p>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <p className="caveat text-lg text-coral-500">small print</p>
            <h4 className="mt-1 text-sm font-bold uppercase tracking-[0.15em] text-ink-500">서비스 정보</h4>
            <ul className="mt-3 space-y-2.5">
              {companyInfo.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="group inline-flex items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-coral-500"
                  >
                    {item.label}
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="my-8 h-px bg-[repeating-linear-gradient(90deg,rgba(43,33,24,0.2)_0,rgba(43,33,24,0.2)_4px,transparent_4px,transparent_10px)]" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-ink-300 sm:flex-row">
          <p>© 2020–2026 DoubleJ Biz. · Rangu.fam</p>
          <p className="caveat text-base text-ink-300">
            built with <span className="text-coral-500">♥</span> for our friendship
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
