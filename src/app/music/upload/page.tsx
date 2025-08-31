'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Music, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input, Button, Textarea } from '@/components/ui'
import { musicService, validateAudioFile, formatFileSize } from '@/services/musicService'

interface DbTrack {
  _id: string
  title: string
  artist: string
  album?: string
  duration: number
  coverImage?: string
  audioFile?: string
  audioFileName?: string
  audioFileSize?: number
  sourceType: 'youtube' | 'soundcloud' | 'file' | 'spotify'
  uploadedBy: string
  uploadedById: string
  createdAt: string
  updatedAt: string
  genre?: string
  tags: string[]
  description?: string
  youtubeId?: string
  soundcloudUrl?: string
  likesCount: number
  playsCount: number
  commentsIds: string[]
  playlistsIds: string[]
}

const genres = [
  'All', 'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B', 'Reggae',
  'Blues', 'Folk', 'Punk', 'Metal', 'Alternative', 'Indie', 'Dance', 'House', 'Techno', 'Trance',
  'Dubstep', 'Drum & Bass', 'Ambient', 'Lo-fi', 'Chill', 'Acoustic', 'Other'
]

export default function UploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // 업로드 단계 상태
  const [uploadStep, setUploadStep] = useState<'select' | 'details' | 'uploading' | 'complete'>('select')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadAttempted, setUploadAttempted] = useState(false) // 업로드 시도 추적
  
  // 파일 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileValidation, setFileValidation] = useState<{ isValid: boolean; error?: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // 앨범 커버 상태
  const [selectedCover, setSelectedCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  
  // 폼 상태
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    tags: '',
    description: ''
  })

  // 파일 처리 공통 함수
  const processFile = (file: File) => {
    const validation = validateAudioFile(file)
    setFileValidation(validation)
    
    if (validation.isValid) {
      setSelectedFile(file)
      // 파일명에서 제목과 아티스트 추출 시도
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      const parts = fileName.split('-').map(part => part.trim())
      if (parts.length >= 2) {
        setUploadForm(prev => ({
          ...prev,
          artist: parts[0],
          title: parts.slice(1).join(' - ')
        }))
      } else {
        setUploadForm(prev => ({
          ...prev,
          title: fileName
        }))
      }
      setUploadStep('details')
    } else {
      setSelectedFile(null)
    }
  }

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setFileValidation(null)
      return
    }
    processFile(file)
  }

  // 앨범 커버 선택 핸들러
  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedCover(null)
      setCoverPreview(null)
      return
    }

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 파일 크기는 5MB 이하여야 합니다.')
      return
    }

    setSelectedCover(file)
    
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  // 파일 업로드 처리
  const handleFileUpload = async () => {
    // 강력한 중복 방지 체크
    if (!uploadForm.title || !uploadForm.artist || !selectedFile || !user || isUploading || uploadAttempted) {
      console.log('업로드 조건 미충족 또는 이미 시도됨')
      return
    }

    console.log('업로드 시작...')
    setIsUploading(true)
    setUploadAttempted(true) // 업로드 시도 마킹
    setUploadStep('uploading')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('audioFile', selectedFile)
      formData.append('title', uploadForm.title)
      formData.append('artist', uploadForm.artist)
      formData.append('album', uploadForm.album)
      formData.append('genre', uploadForm.genre || 'Other')
      formData.append('tags', uploadForm.tags)
      formData.append('description', uploadForm.description)
      formData.append('uploadedBy', user.username)
      formData.append('uploadedById', user.id)
      
      // 커버 이미지가 있으면 추가
      if (selectedCover) {
        formData.append('coverImage', selectedCover)
      }

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + Math.random() * 15
          return prev
        })
      }, 200)

      const response = await musicService.uploadTrackFile(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (response.success && response.data) {
        console.log('업로드 성공!')
        setTimeout(() => {
          setUploadStep('complete')
        }, 500)
        
        // 3초 후 음악 페이지로 이동 및 새로고침
        setTimeout(() => {
          router.push('/music')
          window.location.reload()
        }, 3000)
      } else {
        console.log('업로드 실패:', response.error)
        alert(response.error || '파일 업로드에 실패했습니다.')
        setUploadStep('details')
        setUploadAttempted(false) // 실패 시 재시도 가능하도록
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
      setUploadStep('details')
      setUploadAttempted(false) // 오류 시 재시도 가능하도록
    } finally {
      setIsUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">음악을 업로드하려면 먼저 로그인해주세요.</p>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-[#f50] text-white hover:bg-orange-600"
          >
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-[#f50] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/music')}
              className="p-2 hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Upload</h1>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto p-8">
        <AnimatePresence mode="wait">
          {uploadStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Upload your audio files.</h2>
              <p className="text-gray-600 mb-12 text-lg">
                최고 품질을 위해 WAV, FLAC, AIFF 또는 ALAC을 사용하세요. 최대 파일 크기는 4GB입니다.
              </p>

              {/* 파일 드롭 영역 */}
              <div
                className={`border-2 border-dashed rounded-xl p-16 transition-all duration-300 ${
                  isDragOver 
                    ? 'border-[#f50] bg-orange-50 scale-105' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="audio-file-input"
                />
                <div className="flex flex-col items-center space-y-6">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-800 mb-3">
                      Drag and drop audio files to get started.
                    </p>
                    <label
                      htmlFor="audio-file-input"
                      className="inline-block bg-[#f50] text-white hover:bg-orange-600 border-0 px-8 py-3 text-lg rounded-lg cursor-pointer font-medium transition-colors"
                    >
                      Choose files
                    </label>
                  </div>
                </div>
              </div>

              {/* 파일 검증 오류 표시 */}
              {fileValidation && !fileValidation.isValid && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600"
                >
                  {fileValidation.error}
                </motion.div>
              )}
            </motion.div>
          )}

          {uploadStep === 'details' && selectedFile && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-8">Track info</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* 왼쪽: 아트워크 업로드 */}
                <div>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 relative group">
                    {coverPreview ? (
                      <>
                        <img 
                          src={coverPreview} 
                          alt="Album cover preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                          <label
                            htmlFor="cover-file-input"
                            className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-4 py-2 rounded-lg cursor-pointer font-medium transition-opacity"
                          >
                            Change Image
                          </label>
                        </div>
                      </>
                    ) : (
                      <label
                        htmlFor="cover-file-input"
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                          <Music className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">Add new artwork</p>
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG (최대 5MB)</p>
                      </label>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverSelect}
                      className="hidden"
                      id="cover-file-input"
                    />
                  </div>
                  
                  {/* 파일 정보 */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-800 mb-2">Selected Audio File</h4>
                    <p className="text-sm text-gray-600 mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  
                  {/* 커버 이미지 정보 */}
                  {selectedCover && (
                    <div className="bg-white p-4 rounded-lg border mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Cover Image</h4>
                      <p className="text-sm text-gray-600 mb-1">{selectedCover.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedCover.size)}</p>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 트랙 정보 */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Track title *
                    </label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                      className="w-full text-lg"
                      placeholder="Enter track title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Artist(s) *
                    </label>
                    <Input
                      value={uploadForm.artist}
                      onChange={(e) => setUploadForm({...uploadForm, artist: e.target.value})}
                      placeholder="RANGGU(Prod.Unb&whitepalette)"
                      className="w-full text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use commas to add multiple artist names.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Album
                    </label>
                    <Input
                      value={uploadForm.album}
                      onChange={(e) => setUploadForm({...uploadForm, album: e.target.value})}
                      placeholder="Album name (optional)"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Genre
                    </label>
                    <select
                      value={uploadForm.genre}
                      onChange={(e) => setUploadForm({...uploadForm, genre: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f50] focus:border-transparent text-lg"
                    >
                      <option value="">Add or search for genre</option>
                      {genres.slice(1).map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <Input
                      placeholder="Add styles, moods, tempo..."
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      placeholder="Tracks with descriptions tend to get more plays and engagements."
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                      rows={4}
                      className="w-full"
                    />
                  </div>

                  {/* Track Privacy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Track Privacy
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="privacy"
                          value="public"
                          defaultChecked
                          className="w-4 h-4 text-[#f50] border-gray-300 focus:ring-[#f50]"
                        />
                        <span className="ml-3 text-gray-700">Public</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="privacy"
                          value="private"
                          className="w-4 h-4 text-[#f50] border-gray-300 focus:ring-[#f50]"
                        />
                        <span className="ml-3 text-gray-700">Private</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 업로드 버튼 */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex space-x-4">
                  <Button
                    onClick={handleFileUpload}
                    disabled={!uploadForm.title || !uploadForm.artist || isUploading}
                    className="bg-[#f50] text-white hover:bg-orange-600 border-0 px-12 py-3 text-lg"
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={() => {
                      setUploadStep('select')
                      setIsUploading(false)
                      setUploadProgress(0)
                    }}
                    variant="ghost"
                    className="px-12 py-3 text-lg"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {uploadStep === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-[#f50] rounded-full flex items-center justify-center mx-auto mb-8">
                <Upload className="w-12 h-12 text-white animate-pulse" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Uploading...</h3>
              <p className="text-gray-600 text-xl mb-8">
                {selectedFile?.name} - {Math.round(uploadProgress)}%
              </p>

              {/* 진행률 바 */}
              <div className="w-full max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-[#f50] h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-gray-500">
                  Processing audio file...
                </p>
              </div>
            </motion.div>
          )}

          {uploadStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Upload Complete!</h3>
              <p className="text-gray-600 text-xl mb-6">
                Your track "{uploadForm.title}" has been uploaded successfully.
              </p>
              <p className="text-gray-500 mb-8">
                Redirecting to music page...
              </p>
              
              <Button
                onClick={() => router.push('/music')}
                className="bg-[#f50] text-white hover:bg-orange-600 border-0 px-8 py-3"
              >
                Go to Music
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
