import mongoose from 'mongoose'

// 테트리스 키 설정 스키마
const TetrisKeysSchema = new mongoose.Schema({
  moveLeft: { type: String, default: 'ArrowLeft' },
  moveRight: { type: String, default: 'ArrowRight' },
  softDrop: { type: String, default: 'ArrowDown' },
  hardDrop: { type: String, default: ' ' }, // Space
  rotateLeft: { type: String, default: 'z' },
  rotateRight: { type: String, default: 'ArrowUp' },
  rotate180: { type: String, default: 'a' },
  hold: { type: String, default: 'c' }
})

// 봇 설정 스키마
const BotSettingsSchema = new mongoose.Schema({
  tetris: {
    enabled: { type: Boolean, default: false },
    difficulty: { type: String, enum: ['easy', 'normal', 'hard'], default: 'normal' },
    speed: { type: Number, default: 1.0 } // 봇 플레이 속도 배수
  },
  wordchain: {
    enabled: { type: Boolean, default: false },
    difficulty: { type: String, enum: ['easy', 'normal', 'hard'], default: 'normal' },
    responseTime: { type: Number, default: 5000 } // 봇 응답 시간 (ms)
  },
  cardgame: {
    enabled: { type: Boolean, default: false },
    difficulty: { type: String, enum: ['easy', 'normal', 'hard'], default: 'normal' },
    strategy: { type: String, enum: ['aggressive', 'defensive', 'balanced'], default: 'balanced' }
  }
})

// 게임 설정 스키마
const GameSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tetrisKeys: { type: TetrisKeysSchema, default: {} },
  botSettings: { type: BotSettingsSchema, default: {} },
  preferences: {
    soundEnabled: { type: Boolean, default: true },
    animationsEnabled: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true }
  }
}, {
  timestamps: true
})

export const GameSettings = mongoose.models.GameSettings || mongoose.model('GameSettings', GameSettingsSchema)
export type IGameSettings = mongoose.InferSchemaType<typeof GameSettingsSchema>
export type ITetrisKeys = mongoose.InferSchemaType<typeof TetrisKeysSchema>
export type IBotSettings = mongoose.InferSchemaType<typeof BotSettingsSchema> 