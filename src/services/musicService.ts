// 음악 관련 API 서비스
const API_BASE = '/api'

export interface Track {
  _id: string
  title: string
  artist: string
  album?: string
  duration: number
  youtubeId?: string
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

  // 새 트랙 업로드
  async uploadTrack(trackData: {
    title: string
    artist: string
    album?: string
    duration?: number
    youtubeId: string
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