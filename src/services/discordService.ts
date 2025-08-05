import { 
  DiscordServer, 
  DiscordMusicQueue, 
  DiscordCommandLog, 
  DiscordUserLink, 
  DiscordBotStatus,
  IDiscordServer,
  IDiscordMusicQueue,
  IDiscordCommandLog,
  IDiscordUserLink,
  IDiscordBotStatus
} from '@/models/DiscordBot'
import Track from '@/models/Track'

export class DiscordService {
  // 서버 관리
  static async getOrCreateServer(guildId: string, guildName: string): Promise<IDiscordServer> {
    let server = await DiscordServer.findOne({ guildId })
    
    if (!server) {
      server = new DiscordServer({
        guildId,
        guildName,
        settings: {
          commandPrefix: '!',
          autoJoin: false,
          volume: 50,
          enableNotifications: true
        },
        isActive: true,
        lastActivity: new Date()
      })
      await server.save()
    } else {
      // 서버명 업데이트 및 활동 시간 갱신
      server.guildName = guildName
      server.lastActivity = new Date()
      await server.save()
    }
    
    return server
  }

  static async updateServerSettings(guildId: string, settings: Partial<IDiscordServer['settings']>): Promise<IDiscordServer | null> {
    const server = await DiscordServer.findOneAndUpdate(
      { guildId },
      { 
        $set: { 
          settings: settings,
          lastActivity: new Date()
        }
      },
      { new: true }
    )
    return server
  }

  static async getServerSettings(guildId: string): Promise<IDiscordServer | null> {
    return await DiscordServer.findOne({ guildId })
  }

  // 음악 큐 관리
  static async getOrCreateQueue(guildId: string): Promise<IDiscordMusicQueue> {
    let queue = await DiscordMusicQueue.findOne({ guildId })
    
    if (!queue) {
      queue = new DiscordMusicQueue({
        guildId,
        tracks: [],
        currentTrackIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 50,
        loop: 'none',
        shuffle: false,
        lastUpdated: new Date()
      })
      await queue.save()
    }
    
    return queue
  }

  static async addToQueue(
    guildId: string, 
    trackData: {
      trackId: string
      title: string
      artist?: string
      youtubeId?: string
      duration?: number
      requestedBy?: {
        userId: string
        username: string
      }
    }
  ): Promise<IDiscordMusicQueue> {
    const queue = await this.getOrCreateQueue(guildId)
    
    const updatedQueue = await DiscordMusicQueue.findOneAndUpdate(
      { guildId },
      { 
        $push: {
          tracks: {
            ...trackData,
            addedAt: new Date()
          }
        },
        lastUpdated: new Date()
      },
      { new: true }
    )
    
    return updatedQueue || queue
  }

  static async removeFromQueue(guildId: string, index: number): Promise<IDiscordMusicQueue | null> {
    const queue = await DiscordMusicQueue.findOne({ guildId })
    if (!queue || !queue.tracks[index]) return null
    
    queue.tracks.splice(index, 1)
    
    // 현재 재생 중인 트랙이 제거된 경우 인덱스 조정
    if (index < queue.currentTrackIndex) {
      queue.currentTrackIndex = Math.max(0, queue.currentTrackIndex - 1)
    } else if (index === queue.currentTrackIndex && index >= queue.tracks.length) {
      queue.currentTrackIndex = Math.max(0, queue.tracks.length - 1)
    }
    
    queue.lastUpdated = new Date()
    await queue.save()
    return queue
  }

  static async clearQueue(guildId: string): Promise<IDiscordMusicQueue | null> {
    const queue = await DiscordMusicQueue.findOneAndUpdate(
      { guildId },
      { 
        tracks: [],
        currentTrackIndex: 0,
        isPlaying: false,
        isPaused: false,
        lastUpdated: new Date()
      },
      { new: true }
    )
    return queue
  }

  static async updateQueueState(
    guildId: string, 
    state: {
      currentTrackIndex?: number
      isPlaying?: boolean
      isPaused?: boolean
      volume?: number
      loop?: 'none' | 'track' | 'queue'
      shuffle?: boolean
      voiceChannelId?: string
      textChannelId?: string
    }
  ): Promise<IDiscordMusicQueue | null> {
    const queue = await DiscordMusicQueue.findOneAndUpdate(
      { guildId },
      { 
        ...state,
        lastUpdated: new Date()
      },
      { new: true }
    )
    return queue
  }

  static async getQueue(guildId: string): Promise<IDiscordMusicQueue | null> {
    return await DiscordMusicQueue.findOne({ guildId })
  }

  // 다음/이전 트랙으로 이동
  static async nextTrack(guildId: string): Promise<IDiscordMusicQueue | null> {
    const queue = await DiscordMusicQueue.findOne({ guildId })
    if (!queue || queue.tracks.length === 0) return null

    let nextIndex = queue.currentTrackIndex + 1
    
    if (queue.shuffle) {
      nextIndex = Math.floor(Math.random() * queue.tracks.length)
    } else if (nextIndex >= queue.tracks.length) {
      nextIndex = queue.loop === 'queue' ? 0 : queue.tracks.length - 1
    }

    queue.currentTrackIndex = nextIndex
    queue.lastUpdated = new Date()
    await queue.save()
    return queue
  }

  static async previousTrack(guildId: string): Promise<IDiscordMusicQueue | null> {
    const queue = await DiscordMusicQueue.findOne({ guildId })
    if (!queue || queue.tracks.length === 0) return null

    let prevIndex = queue.currentTrackIndex - 1
    
    if (prevIndex < 0) {
      prevIndex = queue.loop === 'queue' ? queue.tracks.length - 1 : 0
    }

    queue.currentTrackIndex = prevIndex
    queue.lastUpdated = new Date()
    await queue.save()
    return queue
  }

  // 명령어 로그
  static async logCommand(
    guildId: string,
    userId: string,
    username: string,
    command: string,
    args: string[] = [],
    channelId?: string,
    channelName?: string,
    success: boolean = true,
    error?: string,
    executionTime: number = 0
  ): Promise<IDiscordCommandLog> {
    const log = new DiscordCommandLog({
      guildId,
      userId,
      username,
      command,
      args,
      channelId,
      channelName,
      success,
      error,
      executionTime
    })
    
    await log.save()
    return log
  }

  static async getCommandLogs(
    guildId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IDiscordCommandLog[]> {
    return await DiscordCommandLog.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
  }

  static async getCommandStats(guildId: string, days: number = 7): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await DiscordCommandLog.aggregate([
      { $match: { guildId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$command',
          count: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          errorCount: { $sum: { $cond: ['$success', 0, 1] } },
          avgExecutionTime: { $avg: '$executionTime' }
        }
      },
      { $sort: { count: -1 } }
    ])

    return stats
  }

  // 사용자 연동
  static async generateLinkCode(discordId: string, discordUsername: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // 기존 연동 정보가 있으면 업데이트, 없으면 생성
    await DiscordUserLink.findOneAndUpdate(
      { discordId },
      {
        discordId,
        discordUsername,
        linkCode: code,
        isVerified: false,
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    )
    
    return code
  }

  static async linkUser(linkCode: string, siteUserId: string, siteUsername: string): Promise<IDiscordUserLink | null> {
    const userLink = await DiscordUserLink.findOneAndUpdate(
      { linkCode, isVerified: false },
      {
        siteUserId,
        siteUsername,
        isVerified: true,
        linkCode: undefined, // 연동 완료 후 코드 제거
        lastSeen: new Date()
      },
      { new: true }
    )
    
    return userLink
  }

  static async getUserLink(discordId: string): Promise<IDiscordUserLink | null> {
    return await DiscordUserLink.findOne({ discordId, isVerified: true })
  }

  static async getUserLinkByCode(linkCode: string): Promise<IDiscordUserLink | null> {
    return await DiscordUserLink.findOne({ linkCode, isVerified: false })
  }

  static async updateUserPermissions(
    discordId: string, 
    permissions: Partial<IDiscordUserLink['permissions']>
  ): Promise<IDiscordUserLink | null> {
    return await DiscordUserLink.findOneAndUpdate(
      { discordId, isVerified: true },
      { 
        permissions: permissions,
        lastSeen: new Date()
      },
      { new: true }
    )
  }

  // 봇 상태 관리
  static async updateBotStatus(
    botId: string,
    status: Partial<IDiscordBotStatus>
  ): Promise<IDiscordBotStatus> {
    const botStatus = await DiscordBotStatus.findOneAndUpdate(
      { botId },
      {
        ...status,
        lastHeartbeat: new Date()
      },
      { upsert: true, new: true }
    )
    
    return botStatus
  }

  static async getBotStatus(botId: string): Promise<IDiscordBotStatus | null> {
    return await DiscordBotStatus.findOne({ botId })
  }

  static async heartbeat(botId: string): Promise<void> {
    await DiscordBotStatus.findOneAndUpdate(
      { botId },
      { lastHeartbeat: new Date() },
      { upsert: true }
    )
  }

  // 웹사이트 음악과 디스코드 큐 동기화
  static async syncWebsiteTrack(guildId: string, trackId: string): Promise<IDiscordMusicQueue | null> {
    const track = await Track.findById(trackId)
    if (!track) return null

    return await this.addToQueue(guildId, {
      trackId: track._id,
      title: track.title,
      artist: track.artist,
      youtubeId: track.youtubeId,
      duration: track.duration,
      requestedBy: {
        userId: 'website',
        username: 'Website'
      }
    })
  }

  // 활성 서버 통계
  static async getActiveServers(): Promise<IDiscordServer[]> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    return await DiscordServer.find({
      isActive: true,
      lastActivity: { $gte: thirtyMinutesAgo }
    }).sort({ lastActivity: -1 })
  }

  // 인기 명령어 통계
  static async getPopularCommands(days: number = 7): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return await DiscordCommandLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, success: true } },
      {
        $group: {
          _id: '$command',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          command: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  }
}

export default DiscordService