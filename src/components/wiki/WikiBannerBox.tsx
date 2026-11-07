'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BannerBoxStyle } from '@/lib/bannerBox'

export interface WikiBannerBoxProps {
  style: BannerBoxStyle
  /** 배너 */
  background?: string
  leftImage?: string
  rightImage?: string
  logo?: string
  overline?: React.ReactNode
  title?: React.ReactNode
  titleNote?: React.ReactNode
  /** 배너 아래 사진과 설명 */
  photo?: string
  photoCaption?: React.ReactNode
  /** 펼치기·접기 띠 글자 */
  toggleLabel?: string
  /** 위키 문법으로 그린 본문 */
  children?: React.ReactNode
  /** 아래쪽 이전·가운데·다음 */
  footerLeft?: React.ReactNode
  footerCenter?: React.ReactNode
  footerRight?: React.ReactNode
  onImageError?: React.ReactEventHandler<HTMLImageElement>
}

/**
 * {{배너상자}} — 배경 이미지가 깔린 배너, 사진, 펼치기·접기 띠, 본문, 이전·다음 링크.
 * 색과 글은 모두 문서에서 정한다. 이미지는 배경으로 깔지 않고 <img> 로 넣어
 * CSS 주입 없이 주소를 그대로 쓸 수 있게 했다.
 */
export function WikiBannerBox({
  style,
  background,
  leftImage,
  rightImage,
  logo,
  overline,
  title,
  titleNote,
  photo,
  photoCaption,
  toggleLabel,
  children,
  footerLeft,
  footerCenter,
  footerRight,
  onImageError,
}: WikiBannerBoxProps) {
  const [collapsed, setCollapsed] = useState(style.startCollapsed)
  const bodyId = useId()
  const hasBody = Boolean(children) || Boolean(footerLeft || footerCenter || footerRight)
  const hasFooter = Boolean(footerLeft || footerCenter || footerRight)
  // |맨위=예 — 문서 화면이 마련한 자리(안내문보다 위)로 옮겨 그린다. 자리가 없으면 제자리에 그린다.
  const [slot, setSlot] = useState<HTMLElement | null | undefined>(style.pinTop ? undefined : null)
  useEffect(() => {
    if (style.pinTop) setSlot(document.getElementById('wiki-doc-top-slot'))
  }, [style.pinTop])
  if (slot === undefined) return null

  const box = (
    <section
      className={`wiki-banner-box${style.floatRight ? ' wiki-banner-box--float' : ''}`}
      style={{ borderColor: style.border, ...(style.width ? { width: style.width } : {}) }}
    >
      <div
        className="wiki-banner-box__banner"
        style={{ backgroundColor: style.bannerColor, color: style.bannerText, minHeight: style.height }}
      >
        {background && (
          <img className="wiki-banner-box__bg" src={background} alt="" aria-hidden="true" onError={onImageError} />
        )}
        {leftImage && (
          <img className="wiki-banner-box__side wiki-banner-box__side--left" src={leftImage} alt="" onError={onImageError} />
        )}
        {rightImage && (
          <img className="wiki-banner-box__side wiki-banner-box__side--right" src={rightImage} alt="" onError={onImageError} />
        )}
        <div className="wiki-banner-box__heading">
          {logo && <img className="wiki-banner-box__logo" src={logo} alt="" onError={onImageError} />}
          <div className="wiki-banner-box__titles">
            {overline && <p className="wiki-banner-box__overline">{overline}</p>}
            {title && (
              <p className="wiki-banner-box__title">
                {title}
                {titleNote && <small>{titleNote}</small>}
              </p>
            )}
          </div>
        </div>
      </div>

      {photo && (
        <figure className="wiki-banner-box__photo">
          <img src={photo} alt="" onError={onImageError} />
          {photoCaption && (
            <figcaption style={{ backgroundColor: style.barColor, ['--bb-bar-text' as string]: style.barText } as React.CSSProperties}>{photoCaption}</figcaption>
          )}
        </figure>
      )}

      {style.collapsible && hasBody && (
        <button
          type="button"
          className="wiki-banner-box__toggle"
          style={{ backgroundColor: style.barColor, ['--bb-bar-text' as string]: style.barText } as React.CSSProperties}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => setCollapsed((value) => !value)}
        >
          {toggleLabel || '[ 펼치기 · 접기 ]'}
        </button>
      )}

      {hasBody && (
        <div
          id={bodyId}
          className="wiki-banner-box__body"
          hidden={collapsed}
          style={{
            ...(style.bodyColor ? { backgroundColor: style.bodyColor } : {}),
            ...(style.bodyText ? { color: style.bodyText } : {}),
          }}
        >
          {children}
          {hasFooter && (
            <div className="wiki-banner-box__footer">
              <span>{footerLeft}</span>
              <span className="wiki-banner-box__footer-center">{footerCenter}</span>
              <span>{footerRight}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )

  // 오른쪽에 띄운 상자는 기존 정보상자처럼 바로 아래에서 흐름을 끊는다 — 목차·문단은 상자 아래 전체 폭으로 시작
  const placed = style.floatRight ? (
    <>
      {box}
      <div className="wiki-banner-box__clear" aria-hidden="true" />
    </>
  ) : (
    box
  )

  return slot ? createPortal(placed, slot) : placed
}
