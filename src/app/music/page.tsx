'use client'

import React, { useState, useEffect } from 'react'
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

  const handleNext = () => {
    let nextIndex
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length)
    } else {
      nextIndex = (currentTrackIndex + 1) % currentPlaylist.length
    }
    setCurrentTrackIndex(nextIndex)
    setCurrentTrack(currentPlaylist[nextIndex])
  }

  const handlePrev = () => {
    const prevIndex = currentTrackIndex === 0 ? currentPlaylist.length - 1 : currentTrackIndex - 1
    setCurrentTrackIndex(prevIndex)
    setCurrentTrack(currentPlaylist[prevIndex])
  }

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-warm-50">
      {/* 헤더 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <h1 className="text-xl font-bold text-gradient">🎵 Rangu.fam Radio</h1>
            <Button 
              variant="glass" 
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              업로드
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto p-6">
          {/* 헤로 섹션 */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              🎵 Rangu.fam Radio
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              네 친구가 만든 음악과 좋아하는 곡들을 함께 나누는 공간입니다.
              YouTube 링크로 음악을 공유하고, 플레이리스트를 만들어보세요.
            </p>
            
            {/* 통계 정보 */}
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{tracks.length}</div>
                <div className="text-sm text-gray-500">총 트랙</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{playlists.length}</div>
                <div className="text-sm text-gray-500">플레이리스트</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{tracks.reduce((sum, track) => sum + track.plays, 0)}</div>
                <div className="text-sm text-gray-500">총 재생</div>
              </div>
            </div>
          </motion.div>

          {/* 검색 및 필터 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="음악, 아티스트, 앨범, 태그 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="recent">최신순</option>
                  <option value="popular">인기순</option>
                  <option value="alphabetical">가나다순</option>
                </select>
              </div>
            </div>

            {/* 카테고리 탭 */}
            <div className="flex space-x-2 overflow-x-auto">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-500 text-white'
                      : 'glass-button text-gray-600'
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
                  <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center">
                    <Clock className="w-6 h-6 mr-2" />
                    최근 재생
                  </h2>
                  <div className="flex space-x-4 overflow-x-auto pb-4">
                    {recentlyPlayed.slice(0, 5).map((track, index) => (
                      <div
                        key={track._id}
                        className="flex-shrink-0 w-32 cursor-pointer"
                        onClick={() => handlePlay(track)}
                      >
                        <div className="relative">
                          <img
                            src={track.coverImage}
                            alt={track.title}
                            className="w-32 h-32 rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <Play className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <p className="text-sm font-medium mt-2 truncate">{track.title}</p>
                        <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 트랙 목록 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-primary-700 mb-6">음악 라이브러리</h2>
                
                <div className="space-y-3">
                  {tracks.map((track, index) => (
                    <motion.div
                      key={track._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                    >
                      <Card 
                        hover 
                        className={`cursor-pointer transition-all ${
                          currentTrack?._id === track._id ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            {/* 썸네일 및 재생 버튼 */}
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <img
                                src={track.coverImage}
                                alt={track.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <motion.button
                                className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlePlay(track)}
                              >
                                {currentTrack?._id === track._id && isPlaying ? (
                                  <Pause className="w-6 h-6 text-white" />
                                ) : (
                                  <Play className="w-6 h-6 text-white" />
                                )}
                              </motion.button>
                            </div>

                            {/* 트랙 정보 */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-800 truncate">{track.title}</h4>
                              <p className="text-sm text-gray-600 truncate">{track.artist}</p>
                              {track.album && (
                                <p className="text-xs text-gray-500 truncate">{track.album}</p>
                              )}
                              
                              {/* 태그 */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {track.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* 통계 */}
                            <div className="text-right text-sm text-gray-500 flex-shrink-0">
                              <div className="flex items-center space-x-3 mb-1">
                                <span className="flex items-center">
                                  <Eye className="w-3 h-3 mr-1" />
                                  {track.plays}
                                </span>
                                <span className="flex items-center">
                                  <Heart className="w-3 h-3 mr-1" />
                                  {track.likes}
                                </span>
                              </div>
                              <p className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                                {track.genre}
                              </p>
                              <p className="text-xs mt-1">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</p>
                            </div>

                            {/* 액션 버튼들 */}
                            <div className="flex flex-col space-y-2 flex-shrink-0">
                              <div className="flex items-center space-x-1">
                                <motion.button
                                  className={`p-1 rounded transition-colors ${
                                    userFavorites.includes(track._id) ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                                  }`}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleLike(track._id, true)}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleLike(track._id, false)}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </motion.button>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <motion.button
                                  className={`p-1 rounded transition-colors ${
                                    userFavorites.includes(track._id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                                  }`}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleToggleFavorite(track._id)}
                                >
                                  <Star className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                  className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleToggleComments(track._id)}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </motion.button>
                                
                                {track.youtubeId && (
                                  <motion.button
                                    className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
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
                                className="mt-4 pt-4 border-t border-gray-200"
                              >
                                <h5 className="font-medium text-gray-700 mb-3">댓글 ({comments[track._id]?.length || 0})</h5>
                                
                                {/* 새 댓글 작성 */}
                                {user && (
                                  <div className="flex space-x-2 mb-4">
                                    <Input
                                      placeholder="댓글을 입력하세요..."
                                      value={newComment}
                                      onChange={(e) => setNewComment(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button 
                                      size="sm"
                                      onClick={() => handleAddComment(track._id)}
                                      disabled={!newComment.trim()}
                                    >
                                      작성
                                    </Button>
                                  </div>
                                )}
                                
                                {/* 댓글 목록 */}
                                <div className="space-y-3 max-h-40 overflow-y-auto">
                                  {comments[track._id]?.map((comment) => (
                                    <div key={comment._id} className="flex space-x-3">
                                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
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
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* 사이드바 */}
            <div>
              {/* 인기 차트 */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2" />
                  인기 차트
                </h2>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {tracks
                        .sort((a, b) => (b.likes + b.plays) - (a.likes + a.plays))
                        .slice(0, 5)
                        .map((track, index) => (
                          <div
                            key={track._id}
                            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                            onClick={() => handlePlay(track)}
                          >
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10">
                              <img src={track.coverImage} alt="" className="w-10 h-10 rounded object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{track.title}</p>
                              <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {track.likes + track.plays}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 플레이리스트 미리보기 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <h2 className="text-2xl font-bold text-primary-700 mb-4">추천 플레이리스트</h2>
                
                <div className="space-y-4">
                  {playlists.slice(0, 3).map((playlist, index) => (
                    <motion.div
                      key={playlist._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                    >
                      <Card hover className="cursor-pointer">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-gray-800 mb-1">{playlist.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{playlist.description || '설명 없음'}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{playlist.tracksIds.length}곡</span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {playlist.likes}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* 새 플레이리스트 생성 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                  >
                    <Card variant="glass" className="cursor-pointer">
                      <CardContent className="p-4 text-center">
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          onClick={() => setShowCreatePlaylist(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          새 플레이리스트
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
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

      {/* 하단 고정 플레이어 */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <AudioPlayer
          track={currentTrack ? convertToLegacyTrack(currentTrack) : null}
          playlist={currentPlaylist.map(convertToLegacyTrack)}
          isPlaying={isPlaying}
          onPlay={handlePlayPause}
          onPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={() => {}}
          className="m-4"
        />
      </div>
    </div>
  )
} 