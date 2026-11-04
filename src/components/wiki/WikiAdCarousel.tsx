'use client'

import React, { useEffect, useState } from 'react'

const SLIDE_INTERVAL_MS = 5000

interface WikiAd {
  id: string
  title: string
  linkUrl: string
  desktopImage: string
  mobileImage: string
}

/** 위키 메인 광고. 5초마다 넘어가고, 마우스나 키보드가 올라가 있으면 멈춘다. */
export function WikiAdCarousel() {
  const [ads, setAds] = useState<WikiAd[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/wiki/ads')
      .then((response) => response.json())
      .then((data) => {
        if (active && data.success) setAds(data.ads)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (ads.length < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ads.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [ads.length, paused])

  if (ads.length === 0) return null

  return (
    <section
      className="wiki-ad"
      aria-label="광고"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="wiki-ad__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {ads.map((ad, adIndex) => (
          <a
            key={ad.id}
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="wiki-ad__slide"
            aria-hidden={adIndex !== index}
            tabIndex={adIndex === index ? 0 : -1}
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={ad.mobileImage} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.desktopImage} alt={ad.title} />
            </picture>
          </a>
        ))}
      </div>
      <span className="wiki-ad__label">광고</span>
      {ads.length > 1 && (
        <div className="wiki-ad__dots">
          {ads.map((ad, adIndex) => (
            <button
              key={ad.id}
              type="button"
              className="wiki-ad__dot"
              aria-label={`${adIndex + 1}번째 광고 보기`}
              aria-current={adIndex === index}
              onClick={() => setIndex(adIndex)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
