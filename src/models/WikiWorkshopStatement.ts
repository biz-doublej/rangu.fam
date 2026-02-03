import mongoose from 'mongoose'

const WikiWorkshopStatementSchema = new mongoose.Schema(
  {
    issueNumber: { type: Number, required: true, index: true, unique: true },
    speaker: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    // 이랑위키 로그인 아이디(디스코드 연동 아이디 기준)
    listAuthor: { type: String, required: true, trim: true },
    listAuthorDisplayName: { type: String, trim: true },
    listAuthorDiscordId: { type: String, trim: true },
    isSpeakerOfYear: { type: Boolean, default: false },
    awardYear: { type: Number }
  },
  { timestamps: true }
)

WikiWorkshopStatementSchema.index({ createdAt: -1 })
WikiWorkshopStatementSchema.index({ isSpeakerOfYear: 1, awardYear: 1, updatedAt: -1 })

const WikiWorkshopStatement =
  mongoose.models.WikiWorkshopStatement ||
  mongoose.model('WikiWorkshopStatement', WikiWorkshopStatementSchema)

export { WikiWorkshopStatement }
export default WikiWorkshopStatement
