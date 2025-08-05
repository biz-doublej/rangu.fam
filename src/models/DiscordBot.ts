import mongoose from 'mongoose'

// 디스코드 서버 설정 스키마
const DiscordServerSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  guildName: {
    type: String,
    required: true
  },
  settings: {
    musicChannel: String, // 음악 재생 전용 채널
    commandPrefix: {
      type: String,
      default: '!'
    },
    autoJoin: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    enableNotifications: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 디스코드 음악 큐 스키마
const DiscordMusicQueueSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  tracks: [{
    trackId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    artist: String,
    youtubeId: String,
    duration: Number,
    requestedBy: {
      userId: String,
      username: String
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentTrackIndex: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  volume: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  loop: {
    type: String,
    enum: ['none', 'track', 'queue'],
    default: 'none'
  },
  shuffle: {
    type: Boolean,
    default: false
  },
  voiceChannelId: String,
  textChannelId: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 디스코드 명령어 로그 스키마
const DiscordCommandLogSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  command: {
    type: String,
    required: true
  },
  args: [String],
  channelId: String,
  channelName: String,
  success: {
    type: Boolean,
    default: true
  },
  error: String,
  executionTime: {
    type: Number, // milliseconds
    default: 0
  }
}, {
  timestamps: true
})

// 디스코드 사용자 연동 스키마
const DiscordUserLinkSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  discordUsername: {
    type: String,
    required: true
  },
  discordDiscriminator: String,
  siteUserId: {
    type: String,
    required: true,
    index: true
  },
  siteUsername: {
    type: String,
    required: true
  },
  linkCode: String, // 연동 시 사용하는 일회용 코드
  isVerified: {
    type: Boolean,
    default: false
  },
  permissions: {
    canAddMusic: {
      type: Boolean,
      default: true
    },
    canControlPlayback: {
      type: Boolean,
      default: true
    },
    canManageQueue: {
      type: Boolean,
      default: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 디스코드 봇 상태 스키마
const DiscordBotStatusSchema = new mongoose.Schema({
  botId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['online', 'idle', 'dnd', 'offline'],
    default: 'offline'
  },
  activity: {
    type: {
      type: String,
      enum: ['playing', 'streaming', 'listening', 'watching', 'competing'],
      default: 'listening'
    },
    name: {
      type: String,
      default: 'Rangu.fam Radio'
    },
    url: String
  },
  servers: {
    total: {
      type: Number,
      default: 0
    },
    active: {
      type: Number,
      default: 0
    }
  },
  uptime: {
    type: Number,
    default: 0
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

export const DiscordServer = mongoose.models.DiscordServer || mongoose.model('DiscordServer', DiscordServerSchema)
export const DiscordMusicQueue = mongoose.models.DiscordMusicQueue || mongoose.model('DiscordMusicQueue', DiscordMusicQueueSchema)
export const DiscordCommandLog = mongoose.models.DiscordCommandLog || mongoose.model('DiscordCommandLog', DiscordCommandLogSchema)
export const DiscordUserLink = mongoose.models.DiscordUserLink || mongoose.model('DiscordUserLink', DiscordUserLinkSchema)
export const DiscordBotStatus = mongoose.models.DiscordBotStatus || mongoose.model('DiscordBotStatus', DiscordBotStatusSchema)

// TypeScript 인터페이스
export interface IDiscordServer {
  _id: string
  guildId: string
  guildName: string
  settings: {
    musicChannel?: string
    commandPrefix: string
    autoJoin: boolean
    volume: number
    enableNotifications: boolean
  }
  isActive: boolean
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
}

export interface IDiscordMusicQueue {
  _id: string
  guildId: string
  tracks: Array<{
    trackId: string
    title: string
    artist?: string
    youtubeId?: string
    duration?: number
    requestedBy?: {
      userId: string
      username: string
    }
    addedAt: Date
  }>
  currentTrackIndex: number
  isPlaying: boolean
  isPaused: boolean
  volume: number
  loop: 'none' | 'track' | 'queue'
  shuffle: boolean
  voiceChannelId?: string
  textChannelId?: string
  lastUpdated: Date
  createdAt: Date
  updatedAt: Date
}

export interface IDiscordCommandLog {
  _id: string
  guildId: string
  userId: string
  username: string
  command: string
  args: string[]
  channelId?: string
  channelName?: string
  success: boolean
  error?: string
  executionTime: number
  createdAt: Date
  updatedAt: Date
}

export interface IDiscordUserLink {
  _id: string
  discordId: string
  discordUsername: string
  discordDiscriminator?: string
  siteUserId: string
  siteUsername: string
  linkCode?: string
  isVerified: boolean
  permissions: {
    canAddMusic: boolean
    canControlPlayback: boolean
    canManageQueue: boolean
    isAdmin: boolean
  }
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

export interface IDiscordBotStatus {
  _id: string
  botId: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  activity: {
    type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing'
    name: string
    url?: string
  }
  servers: {
    total: number
    active: number
  }
  uptime: number
  version: string
  lastHeartbeat: Date
  createdAt: Date
  updatedAt: Date
}