'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Play, Pause, Music, Album, User, Search, Filter, Plus, 
  Heart, Download, Share2, MessageCircle, MoreVertical, Edit, Trash2,
  Volume2, VolumeX, Repeat, Shuffle, Clock, TrendingUp, Star,
  Youtube, ExternalLink, Upload, Eye, ThumbsUp, ThumbsDown, X
} from 'lucide-react'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  musicService, 
  commentService, 
  playlistService,
  extractYouTubeId, 
  getYouTubeThumbnail,
  Track as DbTrack,
  Comment as DbComment,
  Playlist as DbPlaylist
} from '@/services/musicService'

// 기존 타입들 (레거시)
interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  audioUrl: string
  coverImage: string
  uploadedBy: string
  uploadDate: Date
  genre: string
}

interface Playlist {
  id: string
  name: string
  description: string
  tracks: Track[]
  createdBy: string
  createdDate: Date
  isPublic: boolean
}

export default function MusicPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // 재생 관련 상태
  const [currentTrack, setCurrentTrack] = useState<DbTrack | null>(null)
  const [currentPlaylist, setCurrentPlaylist] = useState<DbTrack[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  // UI 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tracks' | 'playlists' | 'trending' | 'favorites'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alphabetical'>('recent')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  
  // 모달 및 폼 상태
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  
  // 데이터 상태
  const [tracks, setTracks] = useState<DbTrack[]>([])
  const [playlists, setPlaylists] = useState<DbPlaylist[]>([])
  const [userFavorites, setUserFavorites] = useState<string[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<DbTrack[]>([])
  const [comments, setComments] = useState<{ [trackId: string]: DbComment[] }>({})
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingTrack, setIsUploadingTrack] = useState(false)
  
  // 업로드 폼 상태
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    youtubeUrl: '',
    tags: '',
    description: ''
  })
  
  // 새 댓글 상태
  const [newComment, setNewComment] = useState('')

  // DB Track을 AudioPlayer용 Track으로 변환
  const convertToLegacyTrack = (dbTrack: DbTrack): Track => ({
    id: dbTrack._id,
    title: dbTrack.title,
    artist: dbTrack.artist,
    album: dbTrack.album,
    duration: dbTrack.duration,
    audioUrl: dbTrack.youtubeId ? `https://www.youtube.com/watch?v=${dbTrack.youtubeId}` : '',
    coverImage: dbTrack.coverImage,
    uploadedBy: dbTrack.uploadedBy,
    uploadDate: new Date(dbTrack.createdAt),
    genre: dbTrack.genre
  })

  const categories = [
    { id: 'all', label: '전체', icon: Music },
    { id: 'tracks', label: '트랙', icon: Music },
    { id: 'playlists', label: '플레이리스트', icon: Album },
    { id: 'trending', label: '인기', icon: TrendingUp },
    { id: 'favorites', label: '즐겨찾기', icon: Heart }
  ]

  const genres = ['all', 'Lo-fi Hip Hop', 'Ambient', 'Rock', 'Chiptune', 'Pop', 'Electronic']

  // 데이터 로딩
  useEffect(() => {
    loadInitialData()
  }, [])

  // 필터링 및 정렬 적용
  useEffect(() => {
    loadFilteredTracks()
  }, [searchQuery, selectedGenre, sortBy, selectedCategory])

  // 트랙 변경 시 시간 초기화
  useEffect(() => {
    if (currentTrack) {
      setCurrentTime(0)
      setDuration(currentTrack.duration || 180) // 기본값 3분
    }
  }, [currentTrack])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // 트랙 데이터 로드
      const tracksResponse = await musicService.getTracks({ 
        limit: 50,
        sortBy: 'recent' 
      })
      
      if (tracksResponse.success && tracksResponse.data) {
        setTracks(tracksResponse.data)
        setCurrentPlaylist(tracksResponse.data)
      }

      // 플레이리스트 데이터 로드
      const playlistsResponse = await playlistService.getPlaylists({ 
        limit: 20 
      })
      
      if (playlistsResponse.success && playlistsResponse.data) {
        setPlaylists(playlistsResponse.data)
      }

      // 사용자 즐겨찾기 로드 (로그인한 경우)
      if (user) {
        // TODO: 사용자 즐겨찾기 API 구현
        // const favoritesResponse = await userService.getFavorites(user.id)
      }

    } catch (error) {
      console.error('데이터 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFilteredTracks = async () => {
    try {
      const filters: any = {
        limit: 50,
        sortBy,
        search: searchQuery || undefined,
        genre: selectedGenre !== 'all' ? selectedGenre : undefined
      }

      const response = await musicService.getTracks(filters)
      
      if (response.success && response.data) {
        let filteredTracks = response.data
        
        // 즐겨찾기 필터 적용
        if (selectedCategory === 'favorites') {
          filteredTracks = filteredTracks.filter(track => 
            userFavorites.includes(track._id)
          )
        }
        
        setTracks(filteredTracks)
      }
    } catch (error) {
      console.error('필터링된 트랙 로딩 오류:', error)
    }
  }

  // 댓글 로딩
  const loadComments = async (trackId: string) => {
    try {
      const response = await commentService.getComments({ trackId })
      if (response.success && response.data) {
        setComments(prev => ({
          ...prev,
          [trackId]: response.data || []
        }))
      }
    } catch (error) {
      console.error('댓글 로딩 오류:', error)
    }
  }

  // 재생 관련 함수들
  const handlePlay = async (track: DbTrack) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    const trackIndex = currentPlaylist.findIndex(t => t._id === track._id)
    setCurrentTrackIndex(trackIndex >= 0 ? trackIndex : 0)
    
    // 재생 횟수 증가
    try {
      await musicService.updateTrack(track._id, 'play')
      
      // 로컬 상태 업데이트
      setTracks(prev => prev.map(t => 
        t._id === track._id ? { ...t, plays: t.plays + 1 } : t
      ))
      
      // 최근 재생 목록에 추가
      setRecentlyPlayed(prev => [track, ...prev.filter(t => t._id !== track._id)].slice(0, 10))
    } catch (error) {
      console.error('재생수 업데이트 오류:', error)
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleNext = useCallback(() => {
    let nextIndex
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length)
    } else {
      nextIndex = (currentTrackIndex + 1) % currentPlaylist.length
    }
    setCurrentTrackIndex(nextIndex)
    setCurrentTrack(currentPlaylist[nextIndex])
  }, [isShuffled, currentTrackIndex, currentPlaylist])

  const handlePrev = () => {
    const prevIndex = currentTrackIndex === 0 ? currentPlaylist.length - 1 : currentTrackIndex - 1
    setCurrentTrackIndex(prevIndex)
    setCurrentTrack(currentPlaylist[prevIndex])
  }

  // 재생 시간 업데이트 (handleNext 선언 후)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1
          if (newTime >= duration && duration > 0) {
            // 트랙 종료 처리
            if (repeatMode === 'one') {
              setCurrentTime(0)
              return 0
            } else if (repeatMode === 'all' || currentTrackIndex < currentPlaylist.length - 1) {
              handleNext()
              return 0
            } else {
              setIsPlaying(false)
              return 0
            }
          }
          return newTime
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentTrack, duration, repeatMode, currentTrackIndex, currentPlaylist.length, handleNext])

  // 좋아요/싫어요 관리
  const handleLike = async (trackId: string, isLike: boolean) => {
    if (!user) return

    try {
      const action = isLike ? 'like' : 'dislike'
      const response = await musicService.updateTrack(trackId, action, { userId: user.id })
      
      if (response.success && response.data) {
        // 로컬 상태 업데이트
        setTracks(prev => prev.map(track => 
          track._id === trackId ? response.data! : track
        ))
        
        // 즐겨찾기 상태 업데이트
        if (isLike) {
          setUserFavorites(prev => 
            prev.includes(trackId) ? prev : [...prev, trackId]
          )
        }
      }
    } catch (error) {
      console.error('좋아요 업데이트 오류:', error)
    }
  }

  // 즐겨찾기 관리
  const handleToggleFavorite = (trackId: string) => {
    setUserFavorites(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  // 업로드 처리
  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.artist || !uploadForm.youtubeUrl || !user) return

    setIsUploadingTrack(true)
    try {
      // YouTube URL에서 비디오 ID 추출
      const youtubeId = extractYouTubeId(uploadForm.youtubeUrl)
      if (!youtubeId) {
        alert('유효하지 않은 YouTube URL입니다.')
        return
      }

      const trackData = {
        title: uploadForm.title,
        artist: uploadForm.artist,
        album: uploadForm.album,
        youtubeId,
        genre: uploadForm.genre || 'Other',
        tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        description: uploadForm.description,
        uploadedBy: user.username,
        uploadedById: user.id
      }

      const response = await musicService.uploadTrack(trackData)
      
      if (response.success && response.data) {
        // 트랙 목록에 추가
        setTracks(prev => [response.data!, ...prev])
        
        // 폼 초기화
        setUploadForm({
          title: '',
          artist: '',
          album: '',
          genre: '',
          youtubeUrl: '',
          tags: '',
          description: ''
        })
        setShowUploadModal(false)
        
        alert('음악이 성공적으로 업로드되었습니다!')
      } else {
        alert(response.error || '업로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('업로드 오류:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploadingTrack(false)
    }
  }

  // 댓글 추가
  const handleAddComment = async (trackId: string) => {
    if (!newComment.trim() || !user) return

    try {
      const response = await commentService.addComment({
        content: newComment,
        userId: user.id,
        username: user.username,
        trackId
      })

      if (response.success && response.data) {
        // 로컬 댓글 상태 업데이트
        setComments(prev => ({
          ...prev,
          [trackId]: [response.data!, ...(prev[trackId] || [])]
        }))
        
        setNewComment('')
      }
    } catch (error) {
      console.error('댓글 추가 오류:', error)
    }
  }

  // 댓글 토글
  const handleToggleComments = (trackId: string) => {
    if (showComments === trackId) {
      setShowComments(null)
    } else {
      setShowComments(trackId)
      // 댓글이 로드되지 않았다면 로드
      if (!comments[trackId]) {
        loadComments(trackId)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-warm-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">음악을 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* SoundCloud 스타일 헤더 */}
      <header className="bg-[#f50] shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <div className="flex items-center space-x-4">
              <motion.button
                className="p-2 text-white hover:bg-orange-600 rounded-lg transition-colors"
                onClick={() => router.push('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Music className="w-5 h-5 text-[#f50]" />
                </div>
                <h1 className="text-xl font-bold text-white">Rangu.fam</h1>
              </div>
            </div>

            {/* 검색바 */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="음악, 아티스트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            {/* 우측 버튼들 */}
            <div className="flex items-center space-x-4">
              <Button 
                className="bg-white text-[#f50] hover:bg-gray-100 border-0 rounded-full px-6"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                업로드
              </Button>
              {user && (
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#f50] font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-0 pb-32">
        {/* SoundCloud 스타일 Hero 섹션 */}
        <div className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="relative max-w-7xl mx-auto px-6 py-16">
            <motion.div
              className="text-center text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                Discover & Share
              </h1>
              <p className="text-xl mb-8 opacity-90">
                네 친구가 만든 음악과 좋아하는 곡들을 함께 나누는 공간
              </p>
              
              {/* 통계 카드 */}
              <div className="flex justify-center space-x-8">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{tracks.length}</div>
                  <div className="text-sm opacity-80">트랙</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{playlists.length}</div>
                  <div className="text-sm opacity-80">플레이리스트</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{tracks.reduce((sum, track) => sum + track.plays, 0)}</div>
                  <div className="text-sm opacity-80">재생수</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
          {/* 네비게이션 탭 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
              <div className="flex space-x-1 overflow-x-auto">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${
                      selectedCategory === category.id
                        ? 'bg-[#f50] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(category.id as any)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <category.icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 필터 및 정렬 */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>
                      {genre === 'all' ? '모든 장르' : genre}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="recent">최신순</option>
                  <option value="popular">인기순</option>
                  <option value="alphabetical">가나다순</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-500">
                {tracks.length}개의 트랙
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-2">
              {/* 최근 재생 */}
              {recentlyPlayed.length > 0 && selectedCategory === 'all' && (
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-[#f50]" />
                          최근 재생
                        </h2>
                        <motion.button
                          className="text-sm text-[#f50] hover:text-orange-600 font-medium"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setRecentlyPlayed([])}
                        >
                          모두 지우기
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex space-x-4 overflow-x-auto pb-2">
                        {recentlyPlayed.slice(0, 8).map((track, index) => (
                          <motion.div
                            key={track._id}
                            className="flex-shrink-0 w-32 cursor-pointer group"
                            onClick={() => handlePlay(track)}
                            whileHover={{ scale: 1.02 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="relative">
                              <img
                                src={track.coverImage}
                                alt={track.title}
                                className="w-32 h-32 rounded-lg object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                                {currentTrack?._id === track._id && isPlaying ? (
                                  <Pause className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                )}
                              </div>
                              {currentTrack?._id === track._id && (
                                <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#f50] rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <p className="text-sm font-medium mt-2 truncate group-hover:text-[#f50] transition-colors">{track.title}</p>
                            <p className="text-xs text-gray-500 truncate">{track.uploadedBy}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 트랙 목록 - SoundCloud 스타일 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest Tracks</h2>
                    <p className="text-gray-600">발견하고 공유할 새로운 음악</p>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {tracks.map((track, index) => (
                      <motion.div
                        key={track._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                          currentTrack?._id === track._id ? 'bg-orange-50 border-l-4 border-[#f50]' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          {/* 재생 버튼 */}
                          <motion.button
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                              currentTrack?._id === track._id && isPlaying 
                                ? 'bg-[#f50] text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-[#f50] hover:text-white'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePlay(track)}
                          >
                            {currentTrack?._id === track._id && isPlaying ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5" />
                            )}
                          </motion.button>

                          {/* 아티스트 아바타 */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {track.uploadedBy[0].toUpperCase()}
                          </div>

                          {/* 트랙 정보 및 Waveform */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm text-gray-600">{track.uploadedBy}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-500">{formatDate.relative(new Date(track.createdAt))}</span>
                            </div>
                            
                            <h4 className="font-semibold text-gray-900 mb-2 hover:text-[#f50] transition-colors">
                              {track.title}
                            </h4>
                            
                            {/* Waveform 시뮬레이션 */}
                            <div 
                              className="flex items-center space-x-1 mb-2 cursor-pointer group"
                              onClick={(e) => {
                                if (currentTrack?._id === track._id) {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  const x = e.clientX - rect.left
                                  const progressPercentage = (x / rect.width) * 100
                                  const newTime = (progressPercentage / 100) * duration
                                  setCurrentTime(Math.max(0, Math.min(duration, newTime)))
                                }
                              }}
                            >
                              {Array.from({ length: 50 }).map((_, i) => {
                                const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
                                const barProgress = (i / 50) * 100
                                const isActive = currentTrack?._id === track._id && barProgress <= progressPercentage
                                
                                return (
                                  <div
                                    key={i}
                                    className={`w-1 rounded-full transition-all duration-200 ${
                                      isActive
                                        ? 'bg-[#f50]' 
                                        : currentTrack?._id === track._id
                                        ? 'bg-orange-200 group-hover:bg-orange-300'
                                        : 'bg-gray-300 group-hover:bg-gray-400'
                                    }`}
                                    style={{ 
                                      height: `${Math.random() * 20 + 8}px`,
                                      opacity: currentTrack?._id === track._id ? 1 : 0.7
                                    }}
                                  />
                                )
                              })}
                            </div>

                            {/* 태그 */}
                            <div className="flex flex-wrap gap-1">
                              {track.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 통계 및 액션 */}
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            {/* 재생 시간 */}
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                            
                            {/* 재생 수 */}
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {track.plays.toLocaleString()}
                            </span>

                            {/* 액션 버튼들 */}
                            <div className="flex items-center space-x-3">
                              <motion.button
                                className={`flex items-center space-x-1 transition-colors ${
                                  userFavorites.includes(track._id) ? 'text-[#f50]' : 'text-gray-400 hover:text-[#f50]'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleLike(track._id, true)}
                              >
                                <Heart className={`w-4 h-4 ${userFavorites.includes(track._id) ? 'fill-current' : ''}`} />
                                <span>{track.likes}</span>
                              </motion.button>

                              <motion.button
                                className="text-gray-400 hover:text-[#f50] transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleToggleComments(track._id)}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </motion.button>

                              <motion.button
                                className="text-gray-400 hover:text-[#f50] transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Share2 className="w-4 h-4" />
                              </motion.button>

                              {track.youtubeId && (
                                <motion.button
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => window.open(`https://youtube.com/watch?v=${track.youtubeId}`, '_blank')}
                                >
                                  <Youtube className="w-4 h-4" />
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                          
                        {/* 댓글 섹션 */}
                        <AnimatePresence>
                          {showComments === track._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-gray-100"
                            >
                              <h5 className="font-medium text-gray-700 mb-3">댓글 ({comments[track._id]?.length || 0})</h5>
                              
                              {/* 새 댓글 작성 */}
                              {user && (
                                <div className="flex space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {user.username[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1 flex space-x-2">
                                    <input
                                      type="text"
                                      placeholder="댓글을 입력하세요..."
                                      value={newComment}
                                      onChange={(e) => setNewComment(e.target.value)}
                                      className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    />
                                    <button
                                      onClick={() => handleAddComment(track._id)}
                                      disabled={!newComment.trim()}
                                      className="px-4 py-2 bg-[#f50] text-white text-sm rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                                    >
                                      작성
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* 댓글 목록 */}
                              <div className="space-y-3 max-h-40 overflow-y-auto">
                                {comments[track._id]?.map((comment) => (
                                  <div key={comment._id} className="flex space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                      {comment.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">{comment.username}</span>
                                        <span className="text-xs text-gray-500">{formatDate.relative(new Date(comment.createdAt))}</span>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 사이드바 */}
            <div className="space-y-6">
              {/* 인기 차트 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-[#f50]" />
                    Trending
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {tracks
                      .sort((a, b) => (b.likes + b.plays) - (a.likes + a.plays))
                      .slice(0, 5)
                      .map((track, index) => (
                        <div
                          key={track._id}
                          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          onClick={() => handlePlay(track)}
                        >
                          <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="w-10 h-10">
                            <img src={track.coverImage} alt="" className="w-10 h-10 rounded object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate hover:text-[#f50] transition-colors">{track.title}</p>
                            <p className="text-xs text-gray-500 truncate">{track.uploadedBy}</p>
                          </div>
                          <div className="text-xs text-gray-400 flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {track.likes + track.plays}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>

              {/* 플레이리스트 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Album className="w-5 h-5 mr-2 text-[#f50]" />
                    Playlists
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {playlists.slice(0, 3).map((playlist, index) => (
                      <motion.div
                        key={playlist._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <h4 className="font-semibold text-gray-800 mb-1 hover:text-[#f50] transition-colors">{playlist.name}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{playlist.description || '설명 없음'}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{playlist.tracksIds.length}곡</span>
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {playlist.likes}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {/* 새 플레이리스트 생성 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                    >
                      <button
                        onClick={() => setShowCreatePlaylist(true)}
                        className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-[#f50] hover:text-[#f50] transition-colors"
                      >
                        <Plus className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-sm">새 플레이리스트</span>
                      </button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* 업로드 모달 */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">새 음악 업로드</h3>
              
              <div className="space-y-4">
                <Input
                  placeholder="제목 *"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                />
                <Input
                  placeholder="아티스트 *"
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({...uploadForm, artist: e.target.value})}
                />
                <Input
                  placeholder="앨범"
                  value={uploadForm.album}
                  onChange={(e) => setUploadForm({...uploadForm, album: e.target.value})}
                />
                <select
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({...uploadForm, genre: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">장르 선택</option>
                  {genres.slice(1).map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
                <Input
                  placeholder="YouTube URL *"
                  value={uploadForm.youtubeUrl}
                  onChange={(e) => setUploadForm({...uploadForm, youtubeUrl: e.target.value})}
                />
                <Input
                  placeholder="태그 (쉼표로 구분)"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                />
                <Textarea
                  placeholder="설명"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  rows={3}
                />
                
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    onClick={handleUpload}
                    disabled={!uploadForm.title || !uploadForm.artist || !uploadForm.youtubeUrl || isUploadingTrack}
                    className="flex-1"
                  >
                    {isUploadingTrack ? '업로드 중...' : '업로드'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1"
                    disabled={isUploadingTrack}
                  >
                    취소
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SoundCloud 스타일 하단 플레이어 */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          {/* 진행 바 */}
          <div className="w-full h-1 bg-gray-200">
            <div 
              className="h-1 bg-[#f50] transition-all duration-300 cursor-pointer"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              onClick={(e) => {
                const rect = e.currentTarget.parentElement!.getBoundingClientRect()
                const x = e.clientX - rect.left
                const progressPercentage = (x / rect.width) * 100
                const newTime = (progressPercentage / 100) * duration
                setCurrentTime(Math.max(0, Math.min(duration, newTime)))
              }}
            ></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* 현재 트랙 정보 */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <img
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{currentTrack.title}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-600 truncate">{currentTrack.uploadedBy}</p>
                    <span className="text-xs text-gray-400">
                      {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 플레이어 컨트롤 */}
              <div className="flex items-center space-x-4">
                <motion.button
                  className="p-2 text-gray-600 hover:text-[#f50] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrev}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>

                <motion.button
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isPlaying ? 'bg-[#f50] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#f50] hover:text-white'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </motion.button>

                <motion.button
                  className="p-2 text-gray-600 hover:text-[#f50] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>
              </div>

              {/* 추가 컨트롤 */}
              <div className="flex items-center space-x-3">
                <motion.button
                  className={`p-2 rounded transition-colors ${
                    isShuffled ? 'text-[#f50] bg-orange-50' : 'text-gray-600 hover:text-[#f50]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsShuffled(!isShuffled)}
                  title="셔플"
                >
                  <Shuffle className="w-4 h-4" />
                </motion.button>

                <motion.button
                  className={`p-2 rounded transition-colors ${
                    repeatMode !== 'none' ? 'text-[#f50] bg-orange-50' : 'text-gray-600 hover:text-[#f50]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setRepeatMode(prev => {
                      if (prev === 'none') return 'all'
                      if (prev === 'all') return 'one'
                      return 'none'
                    })
                  }}
                  title={repeatMode === 'none' ? '반복 없음' : repeatMode === 'all' ? '전체 반복' : '한 곡 반복'}
                >
                  <Repeat className="w-4 h-4" />
                  {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 text-xs">1</span>
                  )}
                </motion.button>

                <motion.button
                  className="p-1 text-gray-600 hover:text-[#f50] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>
                
                <div className="w-20 h-1 bg-gray-200 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const newVolume = (x / rect.width) * 100
                    setVolume(Math.max(0, Math.min(100, newVolume)))
                  }}
                >
                  <div 
                    className="h-1 bg-[#f50] rounded-full transition-all"
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 