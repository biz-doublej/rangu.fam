'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Shuffle, Heart, MoreHorizontal 
} from 'lucide-react'
import { Track } from '@/types'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  track: Track | null
  playlist: Track[]
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (time: number) => void
  className?: string
}

export function AudioPlayer({
  track,
  playlist,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
  className
}: AudioPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // 음파 시각화를 위한 더미 데이터
  const waveformBars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    height: Math.random() * 100 + 10
  }))

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // 재생 상태 변경 시 실제 audio 요소 제어
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        console.log('재생 시도:', track?.title, audioRef.current.src)
        console.log('오디오 readyState:', audioRef.current.readyState)
        console.log('오디오 volume:', audioRef.current.volume)
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('재생 성공!')
            })
            .catch(error => {
              console.error('재생 실패:', error)
              console.error('오디오 URL:', audioRef.current?.src)
            })
        }
      } else {
        audioRef.current.pause()
        console.log('재생 일시정지')
      }
    }
  }, [isPlaying, track])

  // 트랙 변경 시 오디오 로드
  useEffect(() => {
    if (audioRef.current && track) {
      console.log('새 트랙 로딩:', track.title, 'URL:', track.audioUrl)
      
      // URL 접근 가능성 테스트
      fetch(track.audioUrl, { method: 'HEAD' })
        .then(response => {
          console.log('파일 접근 테스트:', response.ok, response.status)
          console.log('Content-Type:', response.headers.get('content-type'))
        })
        .catch(error => {
          console.error('파일 접근 실패:', error)
        })
      
      audioRef.current.load() // 새 트랙 로드
      setCurrentTime(0)
    }
  }, [track])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const newTime = percent * duration
      onSeek(newTime)
      setCurrentTime(newTime)
    }
  }

  if (!track) {
    return (
      <div className={cn('glass-card p-6', className)}>
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary-600" />
          </div>
          <p>재생할 음악을 선택해주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      {/* 히든 오디오 엘리먼트 */}
      <audio
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          console.log('오디오 메타데이터 로드됨:', e.currentTarget.duration)
          setDuration(e.currentTarget.duration)
        }}
        onEnded={onNext}
        onLoadStart={() => console.log('오디오 로드 시작:', track.audioUrl)}
        onCanPlay={() => console.log('오디오 재생 가능 상태')}
        onError={(e) => {
          console.error('오디오 로드 오류:', e.currentTarget.error)
          console.error('오디오 URL:', track.audioUrl)
        }}
        preload="metadata"
      />

      {/* 앨범 아트 및 트랙 정보 */}
      <div className="p-6 pb-4">
        <div className="flex items-center space-x-4">
          {/* 앨범 커버 */}
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-primary-400 to-warm-400 rounded-xl flex items-center justify-center flex-shrink-0"
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
          >
            <span className="text-2xl">🎵</span>
          </motion.div>

          {/* 트랙 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{track.title}</h3>
            <p className="text-sm text-gray-600 truncate">{track.artist}</p>
            {track.album && (
              <p className="text-xs text-gray-500 truncate">{track.album}</p>
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center space-x-2">
            <motion.button
              className={cn(
                'p-2 rounded-lg transition-colors',
                isLiked 
                  ? 'text-red-500 bg-red-50' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
            </motion.button>
            
            <motion.button
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 음파 시각화 */}
      <div className="px-6 pb-4">
        <div className="flex items-end justify-center space-x-1 h-16 bg-gradient-to-r from-primary-100 to-warm-100 rounded-lg p-2">
          {waveformBars.map((bar, index) => (
            <motion.div
              key={bar.id}
              className="bg-gradient-to-t from-primary-500 to-primary-300 rounded-full min-w-[2px]"
              style={{ 
                height: `${bar.height * (isPlaying ? 1 : 0.3)}%`,
                width: '3px'
              }}
              animate={isPlaying ? {
                height: [`${bar.height * 0.3}%`, `${bar.height}%`, `${bar.height * 0.3}%`]
              } : {}}
              transition={{
                duration: 0.8,
                repeat: isPlaying ? Infinity : 0,
                ease: "easeInOut",
                delay: index * 0.05
              }}
            />
          ))}
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="px-6 pb-4">
        <div 
          ref={progressRef}
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleProgressClick}
        >
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
            style={{ 
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
            }}
            layoutId="progress"
          />
          
          {/* 재생 시간 */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center space-x-4">
          {/* 셔플 */}
          <motion.button
            className={cn(
              'p-2 rounded-lg transition-colors',
              isShuffle 
                ? 'text-primary-500 bg-primary-50' 
                : 'text-gray-400 hover:text-primary-500'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsShuffle(!isShuffle)}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>

          {/* 이전 곡 */}
          <motion.button
            className="p-2 rounded-lg text-gray-600 hover:text-primary-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPrev}
          >
            <SkipBack className="w-6 h-6" />
          </motion.button>

          {/* 재생/일시정지 */}
          <motion.button
            className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center text-white shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isPlaying ? onPause : onPlay}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Pause className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Play className="w-6 h-6 ml-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* 다음 곡 */}
          <motion.button
            className="p-2 rounded-lg text-gray-600 hover:text-primary-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onNext}
          >
            <SkipForward className="w-6 h-6" />
          </motion.button>

          {/* 반복 */}
          <motion.button
            className={cn(
              'p-2 rounded-lg transition-colors',
              isRepeat 
                ? 'text-primary-500 bg-primary-50' 
                : 'text-gray-400 hover:text-primary-500'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsRepeat(!isRepeat)}
          >
            <Repeat className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 볼륨 컨트롤 */}
        <div className="flex items-center space-x-3 mt-4">
          <motion.button
            className="text-gray-400 hover:text-gray-600"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </motion.button>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value)
                setVolume(newVolume)
                if (newVolume > 0) setIsMuted(false)
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 