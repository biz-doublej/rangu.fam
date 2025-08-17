import mongoose from 'mongoose'

// 북마크 인터페이스 정의
export interface IBookmark {
  _id?: string
  userId: string  // 사용자 ID (jaewon, minseok, jinkyu, hanul, seungchan, heeyeol)
  title: string   // 북마크 제목
  url: string     // 외부 사이트 URL
  description?: string  // 설명 (선택사항)
  icon?: string   // 아이콘 URL 또는 emoji (선택사항)
  order: number   // 정렬 순서
  createdAt: Date
  updatedAt: Date
}

// 몽고DB 스키마 정의
const BookmarkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    enum: ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'heeyeol'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // URL 유효성 검사
        try {
          new URL(v)
          return true
        } catch {
          return false
        }
      },
      message: '유효한 URL을 입력해주세요.'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  icon: {
    type: String,
    trim: true,
    default: '🔗'  // 기본 아이콘
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true,  // createdAt, updatedAt 자동 생성
  collection: 'bookmarks'
})

// userId와 order로 복합 인덱스 생성 (정렬 최적화)
BookmarkSchema.index({ userId: 1, order: 1 })

// 모델 생성 및 export
export const Bookmark = mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema)