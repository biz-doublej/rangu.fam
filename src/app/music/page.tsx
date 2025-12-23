'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Play, Pause, Music, Album, User, Users, Search, Filter, Plus, ChevronDown, 
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
  extractSoundCloudInfo,
  validateAudioFile,
  formatFileSize,
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
  const [selectedMood, setSelectedMood] = useState<string>('all')
  
  // 모달 및 폼 상태
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
  

  

  
  // 새 댓글 상태
  const [newComment, setNewComment] = useState('')

  // DB Track을 AudioPlayer용 Track으로 변환
  const convertToLegacyTrack = (dbTrack: DbTrack): Track => ({
    id: dbTrack._id,
    title: dbTrack.title,
    artist: dbTrack.artist,
    album: dbTrack.album,
    duration: dbTrack.duration,
    audioUrl: getAudioUrl(dbTrack),
    coverImage: dbTrack.coverImage,
    uploadedBy: dbTrack.uploadedBy,
    uploadDate: new Date(dbTrack.createdAt),
    genre: dbTrack.genre
  })

  // 트랙 소스에 따른 오디오 URL 생성
  const getAudioUrl = (track: DbTrack): string => {
    switch (track.sourceType) {
      case 'youtube':
        return track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : ''
      case 'soundcloud':
        return track.soundcloudUrl || ''
      case 'file':
        // 파일 업로드의 경우 전체 URL 생성
        const audioPath = track.audioFile || ''
        if (audioPath.startsWith('/uploads/')) {
          return `${window.location.origin}${audioPath}`
        }
        return audioPath
      default:
        return ''
    }
  }

  // SoundCloud 스타일 파형 높이 생성 (트랙별 고정 패턴)
  const generateWaveHeight = (index: number, trackId: string): number => {
    // 트랙 ID를 기반으로 시드 생성
    const seed = trackId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
    
    // 유사 랜덤 함수 (같은 trackId에 대해 항상 같은 결과)
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed + n * 0.1) * 10000
      return x - Math.floor(x)
    }
    
    // 자연스러운 파형 패턴 생성
    const baseHeight = 4 + pseudoRandom(index) * 16 // 4px ~ 20px
    const variation = Math.sin(index * 0.3) * 3 // 사인파 변화
    const randomness = pseudoRandom(index * 2) * 4 // 약간의 무작위성
    
    return Math.max(3, Math.min(24, baseHeight + variation + randomness))
  }

  const categories = [
    { id: 'all', label: '전체', icon: Music },
    { id: 'tracks', label: '트랙', icon: Music },
    { id: 'playlists', label: '플레이리스트', icon: Album },
    { id: 'trending', label: '트렌딩', icon: TrendingUp },
    { id: 'favorites', label: '즐겨찾기', icon: Heart }
  ]

  const genres = ['all', 'Lo-fi Hip Hop', 'Ambient', 'Rock', 'Chiptune', 'Pop', 'Electronic']

  const moodFilters = [
    {
      id: 'all',
      label: '모든 바이브',
      description: '모든 라디오/커뮤니티',
      gradient: 'from-gray-100 to-gray-50',
      textColor: 'text-gray-700',
      matchers: [] as string[]
    },
    {
      id: 'night-drive',
      label: 'Night Drive',
      description: '새벽 감성 드라이브',
      gradient: 'from-gray-900 via-gray-800 to-gray-700',
      textColor: 'text-white',
      matchers: ['night', 'drive', 'dark', 'midnight', '밤']
    },
    {
      id: 'study-focus',
      label: 'Focus Lab',
      description: '집중을 위한 lo-fi/ambient',
      gradient: 'from-sky-500 to-indigo-500',
      textColor: 'text-white',
      matchers: ['lofi', 'focus', 'study', 'ambient']
    },
    {
      id: 'sunset-pop',
      label: 'Sunset Pop',
      description: '노을빛 synth/pop',
      gradient: 'from-orange-400 to-pink-500',
      textColor: 'text-white',
      matchers: ['pop', 'sunset', 'summer', 'bright']
    },
    {
      id: '8bit',
      label: '8bit Arcade',
      description: '레트로/chiptune/gaming',
      gradient: 'from-purple-600 to-fuchsia-500',
      textColor: 'text-white',
      matchers: ['chiptune', '8bit', 'game', 'arcade']
    },
    {
      id: 'rainy-day',
      label: 'Rainy Day',
      description: '빗소리와 어울리는 발라드',
      gradient: 'from-blue-900 to-blue-600',
      textColor: 'text-white',
      matchers: ['rain', 'ballad', 'calm', 'acoustic']
    }
  ]

  const discoverGradients = [
    'from-orange-500 to-pink-500',
    'from-indigo-500 via-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-600'
  ]

  const featuredTrack = useMemo<DbTrack | null>(() => {
    if (currentTrack) return currentTrack
    if (!tracks.length) return null
    return [...tracks].sort((a, b) => (b.likes + b.plays) - (a.likes + a.plays))[0]
  }, [tracks, currentTrack])

  const isFeaturedActive = featuredTrack ? currentTrack?._id === featuredTrack._id : false
  const featuredWaveProgress = featuredTrack && isFeaturedActive && (featuredTrack.duration || 0)
    ? Math.min(1, currentTime / (featuredTrack.duration || 1))
    : 0

  const totalStationPlays = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.plays || 0), 0),
    [tracks]
  )

  const totalRuntimeMinutes = useMemo(
    () => Math.floor(tracks.reduce((sum, track) => sum + (track.duration || 0), 0) / 60),
    [tracks]
  )

  const uniqueCreators = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.uploadedBy))).length,
    [tracks]
  )

  const discoverCollections = useMemo(() => {
    if (!tracks.length) return []
    return [...tracks]
      .sort((a, b) => (b.likes + b.plays * 0.5) - (a.likes + a.plays * 0.5))
      .slice(0, 4)
      .map((track, index) => ({
        id: track._id,
        title: track.title,
        description: `${track.genre || '장르 미정'} · ${track.uploadedBy}`,
        gradient: discoverGradients[index % discoverGradients.length],
        coverImage: track.coverImage,
        meta: `${track.plays.toLocaleString()}회 재생`,
        track
      }))
  }, [tracks])

  const liveStations = useMemo(() => {
    if (!tracks.length) return []
    const gradients = [
      'from-orange-500/90 via-pink-500/80 to-red-500/80',
      'from-indigo-600/90 via-purple-600/80 to-fuchsia-500/80',
      'from-emerald-500/90 via-teal-500/80 to-cyan-500/80'
    ]
    return [...tracks]
      .sort((a, b) => (b.plays + b.likes) - (a.plays + a.likes))
      .slice(0, 3)
      .map((track, index) => ({
        id: track._id,
        title: track.title,
        dj: track.uploadedBy,
        listeners: Math.max(1, track.plays + track.likes),
        genre: track.genre || 'Indie',
        gradient: gradients[index % gradients.length],
        coverImage: track.coverImage
      }))
  }, [tracks])

  const communityActivity = useMemo(() => {
    const source = recentlyPlayed.length ? recentlyPlayed : tracks.slice(0, 5)
    if (!source.length) return []
    return source.map((track, index) => ({
      id: `${track._id}-${index}`,
      user: track.uploadedBy,
      action: recentlyPlayed.length ? '방금 재생을 공유했어요' : '첫 재생을 기다리고 있어요',
      time: formatDate.relative(new Date(track.createdAt)),
      trackTitle: track.title,
      coverImage: track.coverImage
    }))
  }, [recentlyPlayed, tracks])

  const trendingTracks = useMemo(
    () => [...tracks].sort((a, b) => (b.likes + b.plays) - (a.likes + a.plays)).slice(0, 5),
    [tracks]
  )

  const playlistsPreview = useMemo(() => playlists.slice(0, 3), [playlists])

  const selectedMoodInfo = moodFilters.find((filter) => filter.id === selectedMood)

  const showTrackList = ['all', 'tracks', 'favorites'].includes(selectedCategory)
  const showPlaylistMain = selectedCategory === 'playlists'
  const showTrendingMain = selectedCategory === 'trending'
  const showSidebarPlaylists = selectedCategory === 'all'
  const showSidebarTrending = selectedCategory === 'all'
  const selectBaseClass = 'appearance-none bg-white/90 text-gray-800 font-semibold px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f50] focus:border-transparent transition w-44'

  const renderTrendingPanel = (delay = 0.6) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl.font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-[#f50]" />
          Trending
        </h2>
      </div>
      <div className="p-4">
        {trendingTracks.length === 0 ? (
          <p className="text-sm text-gray-500">아직 트렌딩 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {trendingTracks.map((track, index) => (
              <div
                key={track._id}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => handlePlay(track)}
              >
                <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div className="w-10 h-10">
                  <img src={track.coverImage} alt={track.title} className="w-10 h-10 rounded object-cover" />
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
        )}
      </div>
    </motion.div>
  )

  const renderPlaylistPanel = (delay = 0.7) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Album className="w-5 h-5 mr-2 text-[#f50]" />
          Playlists
        </h2>
      </div>
      <div className="p-4">
        {playlistsPreview.length === 0 ? (
          <p className="text-sm text-gray-500">아직 생성된 플레이리스트가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {playlistsPreview.map((playlist, index) => (
              <motion.div
                key={playlist._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + index * 0.05 }}
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
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2 }}
          className="mt-4"
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
    </motion.div>
  )

  // 데이터 로딩
  useEffect(() => {
    loadInitialData()
  }, [])

  // 필터링 및 정렬 적용
  useEffect(() => {
    loadFilteredTracks()
  }, [searchQuery, selectedGenre, sortBy, selectedCategory, selectedMood])

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
        
        if (selectedMood !== 'all') {
          const moodMeta = moodFilters.find(filter => filter.id === selectedMood)
          if (moodMeta) {
            filteredTracks = filteredTracks.filter(track => {
              const tags = (track.tags || []).map(tag => tag.toLowerCase())
              const genre = (track.genre || '').toLowerCase()
              if (!moodMeta.matchers.length) return true
              return moodMeta.matchers.some(keyword => 
                genre.includes(keyword) || tags.some(tag => tag.includes(keyword))
              )
            })
          }
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

  const addToQueue = (track: DbTrack) => {
    setCurrentPlaylist(prev => {
      if (prev.some(t => t._id === track._id)) {
        return prev
      }
      return [...prev, track]
    })
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

            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="트랙, 플레이리스트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                className="bg-white text-[#f50] hover:bg-gray-100 border-0 rounded-full px-6"
                onClick={() => router.push('/music/upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                업로드
              </Button>
              {user && (
                <button
                  onClick={() => router.push('/settings')}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#f50] font-bold border border-transparent hover:border-white/60 transition"
                >
                  {user.username[0].toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-0 pb-32">
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
                친구들과 직접 만든 사운드를 한곳에서 발견하고 공유하세요
              </p>
              <div className="flex justify-center space-x-8">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{tracks.length}</div>
                  <div className="text-sm opacity-80">등록된 트랙</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{playlists.length}</div>
                  <div className="text-sm opacity-80">플레이리스트</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                  <div className="text-3xl font-bold">{tracks.reduce((sum, track) => sum + track.plays, 0)}</div>
                  <div className="text-sm opacity-80">총 재생수</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
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

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className={selectBaseClass}
                    aria-label="장르 선택"
                  >
                    {genres.map(genre => (
                      <option key={genre} value={genre}>
                        {genre === 'all' ? '모든 장르' : genre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={selectBaseClass}
                    aria-label="정렬 순서"
                  >
                    <option value="recent">최신순</option>
                    <option value="popular">인기순</option>
                    <option value="alphabetical">이름순</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {tracks.length}개의 트랙
              </div>
            </div>
          </motion.div>

          {featuredTrack && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl border border-gray-800">
                <img
                  src={featuredTrack.coverImage}
                  alt={featuredTrack.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
                <div className="relative grid gap-8 px-8 py-10 lg:grid-cols-[1.5fr_1fr]">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
                      <div className="h-2 w-2 rounded-full bg-[#f50] animate-pulse" />
                      Featured Station
                      {isFeaturedActive && (
                        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide">
                          Now Playing
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight">{featuredTrack.title}</h2>
                      <p className="mt-2 text-lg text-white/80">
                        {featuredTrack.uploadedBy} · {featuredTrack.genre || 'Indie'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-white/80">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {featuredTrack.plays.toLocaleString()}회 재생
                      </span>
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        {featuredTrack.likes.toLocaleString()}개의 좋아요
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {Math.floor((featuredTrack.duration || 0) / 60)}:{((featuredTrack.duration || 0) % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button
                        className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlay(featuredTrack)}
                      >
                        {isFeaturedActive && isPlaying ? (
                          <>
                            <Pause className="h-4 w-4" />
                            일시정지
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            지금 재생
                          </>
                        )}
                      </motion.button>
                      <button className="rounded-full border border-white/40 px-5 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition">
                        세트 소개 보기
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-white/60">총 트랙</p>
                        <p className="text-2xl font-bold">{tracks.length}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-white/60">총 재생수</p>
                        <p className="text-2xl font-bold">{totalStationPlays.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-white/60">참여 크루</p>
                        <p className="text-2xl font-bold">{uniqueCreators}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 md:col-span-3">
                        <p className="text-xs uppercase tracking-wide text-white/60">누적 재생 시간</p>
                        <p className="text-2xl font-bold">{totalRuntimeMinutes.toLocaleString()} min</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={featuredTrack.coverImage}
                        alt={featuredTrack.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{featuredTrack.uploadedBy}</p>
                        <p className="text-xs text-white/70">{featuredTrack.genre || '장르 미정'}</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>Waveform Preview</span>
                        <span>
                          {Math.floor((featuredTrack.duration || 0) / 60)}:
                          {((featuredTrack.duration || 0) % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="mt-3 flex h-24 items-end gap-[2px]">
                        {Array.from({ length: 90 }).map((_, index) => {
                          const waveHeight = generateWaveHeight(index, featuredTrack._id)
                          const isActiveBar = featuredWaveProgress > 0 && index / 90 <= featuredWaveProgress
                          return (
                            <span
                              key={index}
                              className={`w-1 rounded-full ${isActiveBar ? 'bg-[#f50]' : 'bg-white/35'}`}
                              style={{ height: `${waveHeight}px`, opacity: isActiveBar ? 1 : 0.5 }}
                            ></span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">Stations by vibe</p>
                  <h3 className="text-xl font-semibold text-gray-900">감정 바이브 Zapping</h3>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedMoodInfo?.label || '모든 바이브'} · {selectedMoodInfo?.description || '모든 라디오/커뮤니티'}
                </div>
              </div>
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {moodFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedMood(filter.id)}
                    className={`flex min-w-[180px] flex-col rounded-2xl border transition shadow-sm ${
                      selectedMood === filter.id
                        ? 'border-transparent ring-2 ring-[#f50]/70'
                        : 'border-gray-200 hover:border-[#f50]/40'
                    }`}
                  >
                    <div className={`h-full rounded-2xl bg-gradient-to-r ${filter.gradient} p-4 ${filter.textColor}`}>
                      <p className="text-sm font-semibold">{filter.label}</p>
                      <p className="mt-1 text-xs opacity-80">{filter.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-80">
                        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                        {filter.id === selectedMood ? 'Live mix' : 'Tune in'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">SoundCloud 감성 Discover Sets</h3>
              <span className="text-sm text-gray-500">Community Curated</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {discoverCollections.map((collection, index) => {
                const isQueued = currentPlaylist.some(track => track._id === collection.track._id)
                return (
                <motion.div
                  key={collection.id}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${collection.gradient} p-5 text-white`}
                  whileHover={{ scale: 1.01 }}
                >
                  {collection.coverImage && (
                    <img
                      src={collection.coverImage}
                      alt={collection.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">#{index + 1} Station</p>
                    <h4 className="mt-2 text-2xl font-bold">{collection.title}</h4>
                    <p className="mt-1 text-sm text-white/80">{collection.description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-white/80">
                      <span>{collection.meta}</span>
                      <button
                        onClick={() => addToQueue(collection.track)}
                        disabled={isQueued}
                        className={`inline-flex items-center rounded-full border border-white/40 px-3 py-1 transition ${
                          isQueued ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'
                        }`}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" /> {isQueued ? 'Queued' : 'Queue'}
                      </button>
                    </div>
                  </div>
                </motion.div>
                )
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-2 space-y-8">
              {/* 최근 재생 */}
              {recentlyPlayed.length > 0 && selectedCategory === 'all' && (
                <motion.div
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
                            
                            {/* SoundCloud 스타일 Waveform */}
                            <div 
                              className="flex items-center space-x-0.5 mb-2 cursor-pointer group"
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
                              {Array.from({ length: 100 }).map((_, i) => {
                                const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
                                const barProgress = (i / 100) * 100
                                const isActive = currentTrack?._id === track._id && barProgress <= progressPercentage
                                
                                // SoundCloud 스타일 파형 생성 (고정 패턴)
                                const waveHeight = generateWaveHeight(i, track._id)
                                
                                return (
                                  <div
                                    key={i}
                                    className={`w-0.5 rounded-full transition-all duration-100 ${
                                      isActive
                                        ? 'bg-[#f50]' 
                                        : currentTrack?._id === track._id
                                        ? 'bg-orange-200 group-hover:bg-orange-300'
                                        : 'bg-gray-300 group-hover:bg-gray-400'
                                    }`}
                                    style={{ 
                                      height: `${waveHeight}px`,
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

                              {/* 소스 타입별 외부 링크 버튼 */}
                              {track.sourceType === 'youtube' && track.youtubeId && (
                                <motion.button
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => window.open(`https://youtube.com/watch?v=${track.youtubeId}`, '_blank')}
                                  title="YouTube에서 보기"
                                >
                                  <Youtube className="w-4 h-4" />
                                </motion.button>
                              )}

                              {track.sourceType === 'soundcloud' && track.soundcloudUrl && (
                                <motion.button
                                  className="text-gray-400 hover:text-orange-500 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => window.open(track.soundcloudUrl!, '_blank')}
                                  title="SoundCloud에서 듣기"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </motion.button>
                              )}

                              {track.sourceType === 'file' && (
                                <div className="text-gray-400 flex items-center" title="업로드된 파일">
                                  <Upload className="w-4 h-4" />
                                </div>
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
              {/* Live Stations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                <div className="border-b border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Volume2 className="w-5 h-5 mr-2 text-[#f50]" />
                    Now On Air
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">지금 커뮤니티가 듣는 바이브</p>
                </div>
                <div className="p-4 space-y-4">
                  {liveStations.map((station) => (
                    <div
                      key={station.id}
                      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${station.gradient} p-4 text-white shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Live Station</p>
                          <h4 className="text-lg font-semibold">{station.title}</h4>
                          <p className="text-sm text-white/80">{station.dj} · {station.genre}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{station.listeners}명</p>
                          <p className="text-white/70">tuned in</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-white/80">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                          LIVE set
                        </div>
                        <button
                          onClick={() => {
                            const matched = tracks.find((track) => track._id === station.id)
                            if (matched) handlePlay(matched)
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-white/60 px-3 py-1 font-medium leading-none"
                        >
                          <Play className="w-3 h-3" /> 재생
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Community Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                <div className="border-b border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-[#f50]" />
                    Community Feed
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">우리 커뮤의 실시간 소식</p>
                </div>
                <div className="p-4 space-y-3">
                  {communityActivity.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.trackTitle} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {item.user[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.user}</p>
                        <p className="text-xs text-gray-500">{item.action}</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">&quot;{item.trackTitle}&quot; · {item.time}</p>
                      </div>
                      <button
                        className="text-xs text-[#f50] font-medium hover:text-orange-600"
                        onClick={() => {
                          const matched = tracks.find((track) => track._id === item.id)
                          if (matched) handlePlay(matched)
                        }}
                      >
                        재생
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
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
                    {trendingTracks.map((track, index) => (
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
                    {playlistsPreview.map((playlist, index) => (
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
