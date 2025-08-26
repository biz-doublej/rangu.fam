'use client'

import React from 'react'
import * as LucideIcons from 'lucide-react'

interface WikiIconProps {
  name: string
  size?: number
  className?: string
  color?: string
}

// List of supported custom image icons (13 icons only)
const CUSTOM_IMAGE_ICONS = [
  'swiss',
  'usa', 
  'canada',
  'korea',
  'army',
  'ir2',
  'ir',
  'linkedin',
  'soundcloud',
  'github',
  'youtube',
  'web',
  'insta'
] as const

type CustomIconName = typeof CUSTOM_IMAGE_ICONS[number]

// Check if an icon name is a custom image icon
function isCustomImageIcon(name: string): name is CustomIconName {
  return CUSTOM_IMAGE_ICONS.includes(name as CustomIconName)
}

// Get the image path for custom icons
function getCustomIconPath(name: CustomIconName): string {
  return `/images/icons/${name}.png`
}

// Map of common icon aliases to Lucide icon names
const ICON_ALIASES: Record<string, string> = {
  // Common aliases
  'home': 'Home',
  'user': 'User',
  'users': 'Users',
  'settings': 'Settings',
  'search': 'Search',
  'edit': 'Edit',
  'delete': 'Trash2',
  'save': 'Save',
  'close': 'X',
  'menu': 'Menu',
  'plus': 'Plus',
  'minus': 'Minus',
  'check': 'Check',
  'x': 'X',
  'arrow-right': 'ArrowRight',
  'arrow-left': 'ArrowLeft',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'chevron-right': 'ChevronRight',
  'chevron-left': 'ChevronLeft',
  'chevron-up': 'ChevronUp',
  'chevron-down': 'ChevronDown',
  
  // File and folder icons
  'file': 'File',
  'folder': 'Folder',
  'image': 'Image',
  'video': 'Video',
  'music': 'Music',
  'download': 'Download',
  'upload': 'Upload',
  
  // Communication icons
  'mail': 'Mail',
  'phone': 'Phone',
  'message': 'MessageSquare',
  'chat': 'MessageCircle',
  'bell': 'Bell',
  'heart': 'Heart',
  'star': 'Star',
  
  // Status icons
  'info': 'Info',
  'warning': 'AlertTriangle',
  'error': 'AlertCircle',
  'success': 'CheckCircle',
  'help': 'HelpCircle',
  
  // Navigation icons
  'external': 'ExternalLink',
  'link': 'Link',
  'share': 'Share2',
  'copy': 'Copy',
  
  // Media icons
  'play': 'Play',
  'pause': 'Pause',
  'stop': 'Square',
  'volume': 'Volume2',
  'mute': 'VolumeX',
  
  // Time and calendar
  'calendar': 'Calendar',
  'clock': 'Clock',
  'time': 'Clock',
  
  // Korean common icons
  '홈': 'Home',
  '사용자': 'User',
  '검색': 'Search',
  '편집': 'Edit',
  '삭제': 'Trash2',
  '저장': 'Save',
  '설정': 'Settings',
  '알림': 'Bell',
  '좋아요': 'Heart',
  '별': 'Star',
  '정보': 'Info',
  '경고': 'AlertTriangle',
  '오류': 'AlertCircle',
  '성공': 'CheckCircle',
  '도움말': 'HelpCircle',
  '달력': 'Calendar',
  '시계': 'Clock',
  '파일': 'File',
  '폴더': 'Folder',
  '이미지': 'Image',
  '동영상': 'Video',
  '음악': 'Music'
}

export const WikiIcon: React.FC<WikiIconProps> = ({ 
  name, 
  size = 16, 
  className = '', 
  color 
}) => {
  // Check if it's a custom image icon first (priority)
  if (isCustomImageIcon(name.toLowerCase() as CustomIconName)) {
    return (
      <img
        src={getCustomIconPath(name.toLowerCase() as CustomIconName)}
        alt={`${name} icon`}
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{
          objectFit: 'contain',
          verticalAlign: 'middle',
          display: 'inline-block',
          // Note: Custom images don't support color tinting easily
          // Consider using SVG format for better color control
        }}
        onError={(e) => {
          // Simple fallback to a placeholder or hide the image
          console.warn(`Custom icon "${name}" failed to load from ${getCustomIconPath(name.toLowerCase() as CustomIconName)}`)
          const target = e.target as HTMLImageElement
          // Hide the broken image and show alt text
          target.style.display = 'none'
          // Insert a text fallback
          const fallback = document.createElement('span')
          fallback.textContent = `[${name}]`
          fallback.className = `inline-block ${className}`
          fallback.style.fontSize = `${size * 0.7}px`
          fallback.style.color = color || 'currentColor'
          fallback.style.border = '1px solid currentColor'
          fallback.style.padding = '2px 4px'
          fallback.style.borderRadius = '3px'
          target.parentElement?.insertBefore(fallback, target)
        }}
      />
    )
  }
  
  // Fallback to Lucide icons for non-custom icons
  const iconName = ICON_ALIASES[name.toLowerCase()] || name
  const IconComponent = (LucideIcons as any)[iconName]
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in custom icons or Lucide React`)
    const DefaultIcon = LucideIcons.HelpCircle
    return (
      <DefaultIcon 
        size={size} 
        className={`inline-block align-middle ${className}`}
        color={color}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      />
    )
  }
  
  return (
    <IconComponent 
      size={size} 
      className={`inline-block align-middle ${className}`}
      color={color}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}

// Function to parse icon syntax in text
export const parseIconSyntax = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const iconRegex = /!icon:\{([^}]+)\}/g
  let lastIndex = 0
  let match

  while ((match = iconRegex.exec(text)) !== null) {
    // Add text before the icon
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    
    // Parse icon parameters
    const iconParams = match[1]
    const [name, ...options] = iconParams.split(',').map(s => s.trim())
    
    // Parse options
    let size = 16
    let className = ''
    let color = undefined
    
    options.forEach(option => {
      if (option.startsWith('size:')) {
        size = parseInt(option.split(':')[1]) || 16
      } else if (option.startsWith('class:')) {
        className = option.split(':')[1] || ''
      } else if (option.startsWith('color:')) {
        color = option.split(':')[1] || undefined
      }
    })
    
    // Add the icon component
    parts.push(
      <WikiIcon 
        key={`icon-${match.index}`}
        name={name} 
        size={size}
        className={className}
        color={color}
      />
    )
    
    lastIndex = iconRegex.lastIndex
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText.trim()) {
      parts.push(remainingText)
    }
  }
  
  // Filter out empty strings
  return parts.filter(part => {
    if (typeof part === 'string') {
      return part.trim() !== ''
    }
    return true
  })
}

export default WikiIcon