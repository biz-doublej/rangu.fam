'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Settings,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat
} from 'lucide-react'

interface MediaPlayerProps {
  className?: string
  videoSrc?: string
  audioSrc?: string
  title?: string
  subtitle?: string
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  initialVolume?: number
  onVolumeChange?: (volume: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
}

export function MediaPlayer({
  className = '',
  videoSrc,
  audioSrc,
  title = 'Rangu.fam Radio',
  subtitle = '지금 재생 중',
  autoplay = false,
  loop = false,
  muted = false,
  initialVolume = 50,
  onVolumeChange,
  onPlayStateChange
}: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(initialVolume)
  const [isMuted, setIsMuted] = useState(muted)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()

  // 미디어 로드 및 이벤트 핸들러 설정
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const handleLoadedMetadata = () => {
      setDuration(media.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }

    const handleVolumeChange = () => {
      setVolume(media.volume * 100)
      setIsMuted(media.muted)
    }

    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('volumechange', handleVolumeChange)

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [onPlayStateChange])

  // 볼륨 변경
  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume))
    setVolume(clampedVolume)
    setIsMuted(clampedVolume === 0)
    
    if (mediaRef.current) {
      mediaRef.current.volume = clampedVolume / 100
      mediaRef.current.muted = clampedVolume === 0
    }
    
    onVolumeChange?.(clampedVolume)
  }

  // 재생/일시정지 토글
  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause()
      } else {
        mediaRef.current.play()
      }
    }
  }

  // 음소거 토글
  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    
    if (mediaRef.current) {
      mediaRef.current.muted = newMuted
    }
    
    if (newMuted) {
      setVolume(0)
      onVolumeChange?.(0)
    } else {
      const restoredVolume = volume > 0 ? volume : 50
      setVolume(restoredVolume)
      if (mediaRef.current) {
        mediaRef.current.volume = restoredVolume / 100
      }
      onVolumeChange?.(restoredVolume)
    }
  }

  // 진행률 클릭 핸들러
  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !mediaRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    mediaRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // 시간 포맷팅
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 볼륨 아이콘 선택
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX
    if (volume < 30) return Volume1
    return Volume2
  }

  // 볼륨 슬라이더 표시/숨김 관리
  const handleVolumeHover = (show: boolean) => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current)
    }

    if (show) {
      setShowVolumeSlider(true)
    } else {
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false)
      }, 300)
    }
  }

  const VolumeIcon = getVolumeIcon()

  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 메인 플레이어 */}
      <motion.div
        className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'w-80 h-64' : 'w-72 h-20'
        }`}
        animate={{ 
          width: isExpanded ? 320 : 288,
          height: isExpanded ? 256 : 80
        }}
      >
        {/* 비디오/오디오 요소 */}
        {videoSrc ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={videoSrc}
            className={`w-full transition-all duration-300 ${
              isExpanded ? 'h-40 object-cover' : 'h-0'
            }`}
            autoPlay={autoplay}
            loop={loop}
            muted={isMuted}
            playsInline
          />
        ) : audioSrc ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={audioSrc}
            autoPlay={autoplay}
            loop={loop}
            muted={isMuted}
          />
        ) : null}

        {/* 컨트롤 영역 */}
        <div className="p-4">
          {/* 제목 및 정보 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-sm">
                {title}
              </h3>
              <p className="text-xs text-gray-600 truncate">
                {subtitle}
              </p>
            </div>
            
            <motion.button
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-gray-600" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600" />
              )}
            </motion.button>
          </div>

          {/* 진행 바 */}
          <div className="mb-3">
            <div
              ref={progressRef}
              className="media-progress-bar"
              onClick={handleProgressClick}
            >
              <div
                className="media-progress-fill"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              
              {/* 진행 바 핸들 */}
              <div
                className="media-progress-thumb"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            {/* 시간 표시 */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* 재생/일시정지 버튼 */}
              <motion.button
                className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
                onClick={togglePlay}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </motion.button>

              {/* 확장 모드에서만 표시되는 추가 컨트롤 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="flex items-center space-x-1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <motion.button
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <SkipBack className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    
                    <motion.button
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <SkipForward className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    
                    <motion.button
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Repeat className="w-4 h-4 text-gray-600" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 볼륨 컨트롤 */}
            <div className="relative flex items-center">
              <motion.button
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                onClick={toggleMute}
                onMouseEnter={() => handleVolumeHover(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <VolumeIcon className="w-4 h-4 text-gray-600" />
              </motion.button>

              {/* 볼륨 슬라이더 */}
              <AnimatePresence>
                {(showVolumeSlider || isHovering) && (
                  <motion.div
                    className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 p-3"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    onMouseEnter={() => handleVolumeHover(true)}
                    onMouseLeave={() => handleVolumeHover(false)}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs text-gray-600 font-medium">
                        {Math.round(volume)}%
                      </span>
                      
                      <div className="relative h-20 w-6 flex items-center justify-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="vertical-volume-slider"
                          style={{
                            background: `linear-gradient(to top, rgb(59 130 246) 0%, rgb(59 130 246) ${volume}%, rgb(229 231 235) ${volume}%, rgb(229 231 235) 100%)`
                          }}
                        />
                      </div>
                      
                      <div className="flex space-x-1">
                        {[25, 50, 75, 100].map((preset) => (
                          <motion.button
                            key={preset}
                            className="w-6 h-6 rounded-full bg-gray-100 text-xs text-gray-600 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                            onClick={() => handleVolumeChange(preset)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {preset}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 설정 버튼 */}
              <motion.button
                className="p-1 rounded hover:bg-gray-100 transition-colors ml-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 미니 플레이어 (축소 시) */}
      <AnimatePresence>
        {!isExpanded && isHovering && (
          <motion.div
            className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 p-2 min-w-max"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-600">{subtitle}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}