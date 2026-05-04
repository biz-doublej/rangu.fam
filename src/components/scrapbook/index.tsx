'use client'

import React from 'react'
import Image from 'next/image'
import clsx from 'clsx'

type Rotation = 'left' | 'right' | 'extra' | 'none'

const rotationClass: Record<Rotation, string> = {
  left: 'polaroid--rot-l',
  right: 'polaroid--rot-r',
  extra: 'polaroid--rot-xl',
  none: '',
}

interface PolaroidProps {
  src: string
  alt: string
  caption?: string
  rotate?: Rotation
  width?: number
  height?: number
  priority?: boolean
  className?: string
  tape?: 'none' | 'top' | 'top-left' | 'top-right' | 'corners'
  tapeColor?: 'yellow' | 'coral' | 'sage'
  fill?: boolean
  aspect?: 'square' | 'portrait' | 'landscape' | 'wide'
}

const aspectClass = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/10]',
}

/** 폴라로이드 사진 카드 */
export function Polaroid({
  src,
  alt,
  caption,
  rotate = 'none',
  width = 320,
  height = 320,
  priority,
  className,
  tape = 'none',
  tapeColor = 'yellow',
  fill,
  aspect = 'square',
}: PolaroidProps) {
  return (
    <div className={clsx('polaroid', rotationClass[rotate], className)}>
      {tape === 'top' && <span className={clsx('tape tape--top', tapeColor !== 'yellow' && `tape--${tapeColor}`)} />}
      {tape === 'top-left' && <span className={clsx('tape tape--top-left', tapeColor !== 'yellow' && `tape--${tapeColor}`)} />}
      {tape === 'top-right' && <span className={clsx('tape tape--top-right', tapeColor !== 'yellow' && `tape--${tapeColor}`)} />}
      {tape === 'corners' && (
        <>
          <span className="tape tape--top-left" />
          <span className="tape tape--top-right tape--coral" />
        </>
      )}

      <div className={clsx('polaroid-photo', aspectClass[aspect])}>
        {fill ? (
          <Image src={src} alt={alt} fill priority={priority} className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <Image src={src} alt={alt} width={width} height={height} priority={priority} className="h-full w-full object-cover" />
        )}
      </div>
      {caption && <div className="polaroid-caption">{caption}</div>}
    </div>
  )
}

/** 와시 테이프 단독 */
export function TapeStrip({
  color = 'yellow',
  className,
  width,
  rotate,
}: {
  color?: 'yellow' | 'coral' | 'sage'
  className?: string
  width?: number
  rotate?: number
}) {
  const style: React.CSSProperties = {}
  if (width) style.width = `${width}px`
  if (rotate !== undefined) style.transform = `rotate(${rotate}deg)`
  return (
    <span
      className={clsx('tape', color !== 'yellow' && `tape--${color}`, className)}
      style={style}
    />
  )
}

/** 종이 카드 (라이트모드용 글래스 대체) */
export function PaperCard({
  className,
  lined = false,
  children,
  as: Tag = 'div',
}: {
  className?: string
  lined?: boolean
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
}) {
  return (
    <Tag className={clsx('paper-card p-6', lined && 'paper-card--lined', className)}>
      {children}
    </Tag>
  )
}

/** 손글씨 강조 */
export function Handwritten({
  children,
  className,
  size = 'md',
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeCls = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl'
  return <span className={clsx('handwritten', sizeCls, className)}>{children}</span>
}

/** 카베 (영문 손글씨) */
export function CaveatText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx('caveat', className)}>{children}</span>
}

/** 잉크 밑줄 강조 */
export function InkUnderline({
  children,
  variant = 'coral',
  className,
}: {
  children: React.ReactNode
  variant?: 'coral' | 'mustard' | 'sage'
  className?: string
}) {
  return (
    <span
      className={clsx(
        'ink-underline',
        variant === 'mustard' && 'ink-underline--mustard',
        variant === 'sage' && 'ink-underline--sage',
        className
      )}
    >
      {children}
    </span>
  )
}

/** 핀 / 압정 등 작은 장식 */
export function Pin({ color = 'coral', className }: { color?: 'coral' | 'sage' | 'mustard'; className?: string }) {
  const fill = color === 'coral' ? '#E0654E' : color === 'sage' ? '#3E5C4A' : '#C28A2D'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className={clsx('drop-shadow-md', className)}
      aria-hidden
    >
      <ellipse cx="11" cy="9" rx="7" ry="6" fill={fill} />
      <ellipse cx="9" cy="7" rx="2" ry="1.5" fill="#FFFFFF" opacity="0.6" />
      <line x1="11" y1="14" x2="11" y2="20" stroke={fill} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 손그림 화살표 */
export function DoodleArrow({ className, direction = 'right' }: { className?: string; direction?: 'right' | 'down' | 'down-right' }) {
  if (direction === 'down') {
    return (
      <svg className={clsx('doodle', className)} width="60" height="80" viewBox="0 0 60 80" fill="none" aria-hidden>
        <path d="M30 5 C30 30, 25 50, 30 70" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 4" />
        <path d="M22 62 L30 72 L38 62" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  if (direction === 'down-right') {
    return (
      <svg className={clsx('doodle', className)} width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
        <path d="M10 10 C30 20, 40 40, 65 65" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 4" />
        <path d="M55 60 L67 67 L62 55" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={clsx('doodle', className)} width="80" height="40" viewBox="0 0 80 40" fill="none" aria-hidden>
      <path d="M5 22 C 25 12, 45 28, 70 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 4" />
      <path d="M62 12 L72 18 L62 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** 손그림 동그라미 (강조) */
export function DoodleCircle({ className }: { className?: string }) {
  return (
    <svg className={clsx('doodle', className)} width="200" height="80" viewBox="0 0 200 80" fill="none" aria-hidden>
      <ellipse
        cx="100"
        cy="40"
        rx="92"
        ry="32"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="3 3"
        transform="rotate(-2 100 40)"
      />
    </svg>
  )
}
