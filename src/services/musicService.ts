// 음악 관련 API 서비스
const API_BASE = '/api'

export interface Track {
  _id: string
  title: string
  artist: string
  album?: string
  duration: number
  youtubeId?: string
  spotifyId?: string
  soundcloudId?: string
  soundcloudUrl?: string
  audioFile?: string
  audioFileName?: string
  audioFileSize?: number
  sourceType: 'youtube' | 'soundcloud' | 'file' | 'spotify'
  coverImage: string
  uploadedBy: string
  uploadedById: string
  genre: string
  tags: string[]
  description?: string
  likes: number
  dislikes: number
  plays: number
  commentsIds: string[]
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  _id: string
  content: string
  userId: string
  username: string
  trackId?: string
  playlistId?: string
  parentCommentId?: string
  repliesIds: string[]
  likes: number
  isEdited: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
  userById?: {
    username: string
    profileImage?: string
  }
}

export interface Playlist {
  _id: string
  name: string
  description?: string
  tracksIds: string[]
  createdBy: string
  createdById: string
  collaboratorsIds: string[]
  followersIds: string[]
  tags: string[]
  coverImage?: string
  likes: number
  plays: number
  isPublic: boolean
  isCollaborative: boolean
  isFeatured: boolean
  totalDuration: number
  createdAt: string
  updatedAt: string
}

export interface TrackFilters {
  page?: number
  limit?: number
  genre?: string
  search?: string
  sortBy?: 'recent' | 'popular' | 'alphabetical'
  userId?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// 음악 트랙 관련 API
export const musicService = {
  // 트랙 목록 가져오기
  async getTracks(filters: TrackFilters = {}): Promise<ApiResponse<Track[]>> {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`${API_BASE}/tracks?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '트랙을 가져오는데 실패했습니다.')
      }

      return {
        success: true,
        data: data.tracks,
        pagination: data.pagination
      }
    } catch (error) {
      console.error('트랙 조회 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 특정 트랙 가져오기
  async getTrack(id: string): Promise<ApiResponse<Track>> {
    try {
      const response = await fetch(`${API_BASE}/tracks/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '트랙을 가져오는데 실패했습니다.')
      }

      return {
        success: true,
        data: data.track
      }
    } catch (error) {
      console.error('트랙 조회 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 새 트랙 업로드 (URL 기반)
  async uploadTrack(trackData: {
    title: string
    artist: string
    album?: string
    duration?: number
    youtubeId?: string
    soundcloudUrl?: string
    sourceType: 'youtube' | 'soundcloud'
    genre: string
    tags?: string[]
    description?: string
    uploadedBy: string
    uploadedById: string
  }): Promise<ApiResponse<Track>> {
    try {
      const response = await fetch(`${API_BASE}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '트랙 업로드에 실패했습니다.')
      }

      return {
        success: true,
        data: data.track
      }
    } catch (error) {
      console.error('트랙 업로드 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 새 트랙 업로드 (파일 기반)
  async uploadTrackFile(formData: FormData): Promise<ApiResponse<Track>> {
    try {
      const response = await fetch(`${API_BASE}/tracks/upload`, {
        method: 'POST',
        body: formData // FormData는 Content-Type 헤더를 자동으로 설정
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '파일 업로드에 실패했습니다.')
      }

      return {
        success: true,
        data: data.track
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 트랙 액션 (좋아요, 재생수 증가 등)
  async updateTrack(id: string, action: string, data?: any): Promise<ApiResponse<Track>> {
    try {
      const response = await fetch(`${API_BASE}/tracks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '트랙 업데이트에 실패했습니다.')
      }

      return {
        success: true,
        data: result.track
      }
    } catch (error) {
      console.error('트랙 업데이트 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 트랙 삭제
  async deleteTrack(id: string, userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/tracks/${id}?userId=${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '트랙 삭제에 실패했습니다.')
      }

      return {
        success: true,
        data: data.message
      }
    } catch (error) {
      console.error('트랙 삭제 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  }
}

// 댓글 관련 API
export const commentService = {
  // 댓글 목록 가져오기
  async getComments(filters: {
    trackId?: string
    playlistId?: string
    userId?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<Comment[]>> {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`${API_BASE}/comments?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '댓글을 가져오는데 실패했습니다.')
      }

      return {
        success: true,
        data: data.comments,
        pagination: data.pagination
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 새 댓글 추가
  async addComment(commentData: {
    content: string
    userId: string
    username: string
    trackId?: string
    playlistId?: string
    parentCommentId?: string
  }): Promise<ApiResponse<Comment>> {
    try {
      const response = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '댓글 작성에 실패했습니다.')
      }

      return {
        success: true,
        data: data.comment
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  }
}

// YouTube URL에서 비디오 ID 추출
export const extractYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

// SoundCloud URL 유효성 검사
export const validateSoundCloudUrl = (url: string): boolean => {
  const regex = /^https?:\/\/(www\.)?(soundcloud\.com|snd\.sc)\/.+/
  return regex.test(url)
}

// SoundCloud URL에서 트랙 ID 추출 (간단한 유효성 검사용)
export const extractSoundCloudInfo = (url: string): { isValid: boolean; url: string } => {
  const isValid = validateSoundCloudUrl(url)
  return {
    isValid,
    url: isValid ? url : ''
  }
}

// YouTube 썸네일 URL 생성
export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string => {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault'
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

// 오디오 파일 유효성 검사
export const validateAudioFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/flac']
  const maxSize = 50 * 1024 * 1024 // 50MB

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '지원되지 않는 파일 형식입니다. MP3, WAV, OGG, M4A, FLAC 파일만 업로드 가능합니다.'
    }
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: '파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.'
    }
  }

  return { isValid: true }
}

// 파일 크기를 읽기 쉬운 형태로 변환
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 플레이리스트 관련 API
export const playlistService = {
  // 플레이리스트 목록 가져오기
  async getPlaylists(filters: {
    page?: number
    limit?: number
    search?: string
    userId?: string
    isPublic?: boolean
  } = {}): Promise<ApiResponse<Playlist[]>> {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`${API_BASE}/playlists?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '플레이리스트를 가져오는데 실패했습니다.')
      }

      return {
        success: true,
        data: data.playlists,
        pagination: data.pagination
      }
    } catch (error) {
      console.error('플레이리스트 조회 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  },

  // 새 플레이리스트 생성
  async createPlaylist(playlistData: {
    name: string
    description?: string
    tracksIds?: string[]
    tags?: string[]
    isPublic?: boolean
    isCollaborative?: boolean
    createdBy: string
    createdById: string
  }): Promise<ApiResponse<Playlist>> {
    try {
      const response = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playlistData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '플레이리스트 생성에 실패했습니다.')
      }

      return {
        success: true,
        data: data.playlist
      }
    } catch (error) {
      console.error('플레이리스트 생성 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }
    }
  }
}

// 시간 포맷팅 (초 -> MM:SS)
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
} 