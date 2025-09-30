interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  author?: {
    name: string
    url?: string
    icon_url?: string
  }
  footer?: {
    text: string
    icon_url?: string
  }
  thumbnail?: {
    url: string
  }
  image?: {
    url: string
  }
  timestamp?: string
}

interface DiscordWebhookPayload {
  username?: string
  avatar_url?: string
  content?: string
  embeds?: DiscordEmbed[]
}

export class DiscordWebhookService {
  private static readonly WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''
  
  // Available style variants for webhook embeds
  static readonly STYLES = {
    STANDARD: 'standard',
    COMPACT: 'compact',
    CARD: 'card',
    MINIMAL: 'minimal',
  } as const
  
  private static readonly COLORS = {
    // 브랜드 컬러
    RANGU_PURPLE: 0x8B5CF6,
    RANGU_BLUE: 0x3B82F6,
    RANGU_GREEN: 0x10B981,
    RANGU_ORANGE: 0xF59E0B,
    RANGU_RED: 0xEF4444,
    RANGU_PINK: 0xEC4899,
    
    // 상태별 컬러
    SUCCESS: 0x22C55E,
    WARNING: 0xF59E0B,
    ERROR: 0xEF4444,
    INFO: 0x3B82F6,
    
    // 특별한 컬러
    GOLD: 0xFFD700,
    SILVER: 0xC0C0C0,
    DIAMOND: 0xB9F2FF
  }

  private static readonly EMOJIS = {
    // 문서 관련
    NEW_DOC: '📄',
    EDIT_DOC: '✏️',
    DELETE_DOC: '🗑️',
    APPROVE_DOC: '✅',
    REJECT_DOC: '❌',
    
    // 사용자 관련
    LOGIN: '🔑',
    LOGOUT: '🚪',
    REGISTER: '👋',
    BAN: '🔨',
    UNBAN: '🕊️',
    
    // 공지사항
    NOTICE: '📢',
    UPDATE: '🔄',
    MAINTENANCE: '🔧',
    POLICY: '📋',
    
    // 기타
    FIRE: '🔥',
    STAR: '⭐',
    ROCKET: '🚀',
    CROWN: '👑',
    HEART: '💖'
  }

  private static readonly RANGU_AVATAR = 'https://media.discordapp.net/attachments/833512797052076044/1409566696985067600/image.png?ex=68ae8189&is=68ad3009&hm=c9fc86a2165493a637e206c0943b0ea38fe11979225d842c60481748dce24e29&=&format=webp&quality=lossless&width=1320&height=1320'
  private static readonly WIKI_ICON = 'https://media.discordapp.net/attachments/833512797052076044/1409566696985067600/image.png?ex=68ae8189&is=68ad3009&hm=c9fc86a2165493a637e206c0943b0ea38fe11979225d842c60481748dce24e29&=&format=webp&quality=lossless&width=1320&height=1320'

  /**
   * IP 주소 마스킹 처리 (개인정보 보호)
   */
  private static maskIpAddress(ip: string): string {
    if (ip === '127.0.0.1') {
      return '로컬호스트'
    }
    
    // IPv4 주소 마스킹
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`
    }
    
    // IPv6 주소 마스킹
    if (ip.includes(':')) {
      const parts = ip.split(':')
      if (parts.length > 2) {
        return `${parts[0]}:${parts[1]}:**:**:**:**`
      }
    }
    
    return '알 수 없음'
  }

  /**
   * Send a message to Discord webhook
   */
  private static async sendWebhook(payload: DiscordWebhookPayload): Promise<boolean> {
    try {
      if (!this.WEBHOOK_URL) {
        console.error('Discord webhook URL is not configured (DISCORD_WEBHOOK_URL)')
        return false
      }
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Discord webhook error:', response.status, response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('Discord webhook send error:', error)
      return false
    }
  }
  
  // Internal: apply a visual style to a base embed
  private static applyStyle(base: DiscordEmbed, style: string): DiscordEmbed {
    const embed: DiscordEmbed = { ...base }
    switch (style) {
      case 'compact': {
        if (embed.fields) embed.fields = embed.fields.map(f => ({ ...f, inline: true }))
        delete embed.thumbnail
        delete embed.image
        break
      }
      case 'card': {
        const divider = { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false }
        embed.fields = [divider, ...(embed.fields || []), divider]
        if (!embed.thumbnail && embed.image) {
          embed.thumbnail = embed.image
          delete embed.image
        }
        break
      }
      case 'minimal': {
        delete embed.fields
        delete embed.thumbnail
        delete embed.image
        if (embed.description && embed.description.length > 140) {
          embed.description = embed.description.substring(0, 137) + '...'
        }
        break
      }
      // standard: no-op
    }
    return embed
  }

  // Public: send any prepared embed with a chosen style
  static async sendEmbedStyled(
    username: string,
    avatarUrl: string | undefined,
    baseEmbed: DiscordEmbed,
    style: string = 'standard'
  ): Promise<boolean> {
    const embed = this.applyStyle(baseEmbed, style)
    return this.sendWebhook({ username, avatar_url: avatarUrl, embeds: [embed] })
  }

  /**
   * 📄 새 문서 생성 알림
   */
  static async sendDocumentCreate(
    username: string,
    title: string,
    summary: string,
    contentPreview: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      author: {
        name: `${username}님이 새 문서를 작성했습니다`,
        icon_url: this.WIKI_ICON
      },
      title: `${this.EMOJIS.NEW_DOC} ${title}`,
      url: `https://rangu-fam.vercel.app/wiki/${encodeURIComponent(title)}`,
      description: summary || '새로운 문서가 이랑위키에 추가되었습니다!',
      color: this.COLORS.RANGU_GREEN,
      fields: [
        {
          name: `${this.EMOJIS.STAR} 작성자`,
          value: `**${username}**`,
          inline: true
        },
        {
          name: `${this.EMOJIS.FIRE} 문서명`,
          value: `**${title}**`,
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: '이랑위키 • 새 문서',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (contentPreview && contentPreview.trim()) {
      const preview = contentPreview.length > 300 ? 
        contentPreview.substring(0, 297) + '...' : 
        contentPreview
      
      embed.fields?.push({
        name: `${this.EMOJIS.ROCKET} 내용 미리보기`,
        value: `\`\`\`${preview}\`\`\``,
        inline: false
      })
    }

    return this.sendWebhook({ 
      username: '이랑위키 봇',
      avatar_url: this.RANGU_AVATAR,
      embeds: [embed] 
    })
  }

  /**
   * ✏️ 문서 편집 알림
   */
  static async sendDocumentEdit(
    username: string,
    title: string,
    editSummary: string,
    contentChange: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      author: {
        name: `${username}님이 문서를 편집했습니다`,
        icon_url: this.WIKI_ICON
      },
      title: `${this.EMOJIS.EDIT_DOC} ${title}`,
      url: `https://rangu-fam.vercel.app/wiki/${encodeURIComponent(title)}`,
      description: editSummary || '문서가 업데이트되었습니다.',
      color: this.COLORS.RANGU_BLUE,
      fields: [
        {
          name: `${this.EMOJIS.STAR} 편집자`,
          value: `**${username}**`,
          inline: true
        },
        {
          name: `${this.EMOJIS.FIRE} 문서명`,
          value: `**${title}**`,
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: '이랑위키 • 문서 편집',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (contentChange && contentChange.trim()) {
      const change = contentChange.length > 300 ? 
        contentChange.substring(0, 297) + '...' : 
        contentChange
      
      embed.fields?.push({
        name: `${this.EMOJIS.ROCKET} 변경 내용`,
        value: `\`\`\`${change}\`\`\``,
        inline: false
      })
    }

    return this.sendWebhook({ 
      username: '이랑위키 봇',
      avatar_url: this.RANGU_AVATAR,
      embeds: [embed] 
    })
  }

  /**
   * ✅ 문서 승인 알림
   */
  static async sendDocumentApprove(
    moderator: string,
    author: string,
    title: string,
    action: 'approved' | 'rejected' | 'hold',
    reason?: string
  ): Promise<boolean> {
    const colors = {
      approved: this.COLORS.SUCCESS,
      rejected: this.COLORS.ERROR,
      hold: this.COLORS.WARNING
    }

    const emojis = {
      approved: this.EMOJIS.APPROVE_DOC,
      rejected: this.EMOJIS.REJECT_DOC,
      hold: '⏸️'
    }

    const actionText = {
      approved: '승인되었습니다',
      rejected: '불허되었습니다',
      hold: '보류되었습니다'
    }

    const embed: DiscordEmbed = {
      author: {
        name: `${moderator} 운영자의 문서 검토`,
        icon_url: this.WIKI_ICON
      },
      title: `${emojis[action]} 문서가 ${actionText[action]}`,
      url: `https://rangu-fam.vercel.app/wiki/${encodeURIComponent(title)}`,
      description: `**${author}**님이 작성한 **${title}** 문서가 ${actionText[action]}.`,
      color: colors[action],
      fields: [
        {
          name: `${this.EMOJIS.STAR} 작성자`,
          value: `**${author}**`,
          inline: true
        },
        {
          name: `${this.EMOJIS.CROWN} 검토자`,
          value: `**${moderator}**`,
          inline: true
        },
        {
          name: '📋 상태',
          value: `**${actionText[action]}**`,
          inline: true
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: '이랑위키 • 문서 검토',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (reason && reason.trim()) {
      embed.fields?.push({
        name: `💬 ${action === 'approved' ? '승인' : action === 'rejected' ? '불허' : '보류'} 사유`,
        value: `> ${reason}`,
        inline: false
      })
    }

    return this.sendWebhook({ 
      username: '이랑위키 봇',
      avatar_url: this.RANGU_AVATAR,
      embeds: [embed] 
    })
  }

  /**
   * 🔑 사용자 로그인 알림
   */
  static async sendUserLogin(
    username: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    // IP 주소 마스킹 처리
    const maskedIp = ipAddress ? this.maskIpAddress(ipAddress) : '알 수 없음'
    
    const embed: DiscordEmbed = {
      author: {
        name: '이랑위키 사용자 로그인',
        icon_url: this.WIKI_ICON
      },
      title: `${this.EMOJIS.LOGIN} ${username}님이 로그인했습니다`,
      description: '새로운 사용자 활동이 감지되었습니다.',
      color: this.COLORS.RANGU_PURPLE,
      fields: [
        {
          name: `${this.EMOJIS.STAR} 사용자`,
          value: `**${username}**`,
          inline: true
        },
        {
          name: '🌐 IP 주소',
          value: `\`${maskedIp}\``,
          inline: true
        },
        {
          name: '🕐 시간',
          value: new Date().toLocaleString('ko-KR'),
          inline: true
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: '이랑위키 • 사용자 활동',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (userAgent) {
      const browserInfo = this.getBrowserInfo(userAgent)
      embed.fields?.push({
        name: '🌐 브라우저 정보',
        value: `\`${browserInfo}\``,
        inline: false
      })
    }

    return this.sendWebhook({ 
      username: '이랑위키 봇',
      avatar_url: this.RANGU_AVATAR,
      embeds: [embed] 
    })
  }

  /**
   * 📢 공지사항 알림 (개선된 버전)
   */
  static async sendNoticeCreate(
    title: string,
    content: string,
    author: string,
    category: string,
    type: 'announcement' | 'update' | 'maintenance' | 'policy',
    isPinned: boolean = false
  ): Promise<boolean> {
    const typeEmojis = {
      announcement: this.EMOJIS.NOTICE,
      update: this.EMOJIS.UPDATE,
      maintenance: this.EMOJIS.MAINTENANCE,
      policy: this.EMOJIS.POLICY
    }

    const typeColors = {
      announcement: this.COLORS.RANGU_BLUE,
      update: this.COLORS.RANGU_GREEN,
      maintenance: this.COLORS.RANGU_ORANGE,
      policy: this.COLORS.RANGU_PURPLE
    }

    const typeNames = {
      announcement: '일반 공지',
      update: '업데이트',
      maintenance: '점검 공지',
      policy: '정책 변경'
    }

    const embed: DiscordEmbed = {
      author: {
        name: `${author}님이 새 공지사항을 작성했습니다`,
        icon_url: this.WIKI_ICON
      },
      title: `${typeEmojis[type]} ${title}${isPinned ? ' 📌' : ''}`,
      url: 'https://rangu-fam.vercel.app/notices',
      description: content.length > 200 ? content.substring(0, 197) + '...' : content,
      color: typeColors[type],
      fields: [
        {
          name: `${this.EMOJIS.CROWN} 작성자`,
          value: `**${author}**`,
          inline: true
        },
        {
          name: '📋 분류',
          value: `**${typeNames[type]}**`,
          inline: true
        },
        {
          name: '🏷️ 카테고리',
          value: category || '일반',
          inline: true
        }
      ],
      image: isPinned ? {
        url: 'https://rangu-fam.vercel.app/images/slide1.jpg'
      } : undefined,
      footer: {
        text: `RangU.FAM • 공지사항${isPinned ? ' • 📌 상단 고정' : ''}`,
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (isPinned) {
      embed.description = `🔥 **중요 공지** 🔥\n\n${embed.description}`
    }

    return this.sendEmbedStyled('RangU 공지봇', this.RANGU_AVATAR, embed, 'card')
  }

  /**
   * 🚨 사용자 차단/경고 알림
   */
  static async sendUserModeration(
    moderator: string,
    targetUser: string,
    action: 'ban' | 'unban' | 'warn',
    reason: string,
    duration?: string
  ): Promise<boolean> {
    const actionEmojis = {
      ban: this.EMOJIS.BAN,
      unban: this.EMOJIS.UNBAN,
      warn: '⚠️'
    }

    const actionColors = {
      ban: this.COLORS.ERROR,
      unban: this.COLORS.SUCCESS,
      warn: this.COLORS.WARNING
    }

    const actionTexts = {
      ban: '차단되었습니다',
      unban: '차단이 해제되었습니다',
      warn: '경고를 받았습니다'
    }

    const embed: DiscordEmbed = {
      author: {
        name: `${moderator} 운영자의 사용자 관리`,
        icon_url: this.WIKI_ICON
      },
      title: `${actionEmojis[action]} ${targetUser}님이 ${actionTexts[action]}`,
      description: `사용자 관리 조치가 실행되었습니다.`,
      color: actionColors[action],
      fields: [
        {
          name: `${this.EMOJIS.STAR} 대상 사용자`,
          value: `**${targetUser}**`,
          inline: true
        },
        {
          name: `${this.EMOJIS.CROWN} 처리자`,
          value: `**${moderator}**`,
          inline: true
        },
        {
          name: '📋 조치',
          value: `**${actionTexts[action]}**`,
          inline: true
        },
        {
          name: '💬 사유',
          value: `> ${reason}`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: '이랑위키 • 사용자 관리',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    if (duration && action === 'ban') {
      embed.fields?.push({
        name: '⏰ 차단 기간',
        value: duration === '0' ? '**영구 차단**' : `**${duration}일**`,
        inline: true
      })
    }

    return this.sendWebhook({ 
      username: '이랑위키 관리봇',
      avatar_url: this.RANGU_AVATAR,
      embeds: [embed] 
    })
  }

  /**
   * 🎉 특별 이벤트 알림
   */
  static async sendSpecialEvent(
    title: string,
    description: string,
    imageUrl?: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      author: {
        name: 'RangU.FAM 특별 소식',
        icon_url: this.WIKI_ICON
      },
      title: `${this.EMOJIS.ROCKET} ${title}`,
      description: description,
      color: this.COLORS.GOLD,
      image: imageUrl ? { url: imageUrl } : undefined,
      footer: {
        text: 'RangU.FAM • 특별 이벤트',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    return this.sendEmbedStyled('RangU 이벤트봇', this.RANGU_AVATAR, embed, 'card')
  }

  /**
   * 브라우저 정보 파싱
   */
  private static getBrowserInfo(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Google Chrome'
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Microsoft Edge'
    if (userAgent.includes('Opera')) return 'Opera'
    return '알 수 없는 브라우저'
  }

  /**
   * 🧪 테스트 메시지
   */
  static async sendTestMessage(): Promise<boolean> {
    const embed: DiscordEmbed = {
      author: {
        name: 'RangU.FAM 시스템 테스트',
        icon_url: this.WIKI_ICON
      },
      title: `${this.EMOJIS.ROCKET} 디스코드 웹훅 테스트`,
      description: '🎉 새로운 디자인의 웹훅이 정상적으로 작동합니다!',
      color: this.COLORS.RANGU_PURPLE,
      fields: [
        {
          name: '🕐 테스트 시간',
          value: new Date().toLocaleString('ko-KR'),
          inline: true
        },
        {
          name: '✅ 상태',
          value: '**정상 작동**',
          inline: true
        },
        {
          name: '🌟 버전',
          value: '**v4.0 Enhanced**',
          inline: true
        }
      ],
      thumbnail: {
        url: this.RANGU_AVATAR
      },
      footer: {
        text: 'RangU.FAM • 시스템 테스트',
        icon_url: this.WIKI_ICON
      },
      timestamp: new Date().toISOString()
    }

    return this.sendEmbedStyled('RangU 테스트봇', this.RANGU_AVATAR, embed, 'standard')
  }
}
