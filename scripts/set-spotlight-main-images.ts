import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'

const ROOT_DIR = process.cwd()
dotenv.config({ path: path.join(ROOT_DIR, '.env.local'), override: true })

const MAIN_IMAGE_SLIDES = [
  { title: '추억의 사진 1', srcPath: 'images/slide1.jpg', order: 1 },
  { title: '추억의 사진 2', srcPath: 'images/slide2.jpg', order: 2 },
  { title: '추억의 사진 3', srcPath: 'images/slide3.jpg', order: 3 },
  { title: '추억의 사진 4', srcPath: 'images/slide4.jpg', order: 4 },
  { title: '추억의 사진 5', srcPath: 'images/slide5.jpg', order: 5 },
  { title: '추억의 사진 6', srcPath: 'images/slide6.jpg', order: 6 },
  { title: '추억의 사진 7', srcPath: 'images/slide7.jpg', order: 7 },
]

async function main() {
  const { default: dbConnect } = await import('@/lib/mongodb')
  const { default: SpotlightSlide } = await import('@/models/SpotlightSlide')
  await dbConnect()

  await SpotlightSlide.updateMany({}, { $set: { isActive: false } })

  for (const slide of MAIN_IMAGE_SLIDES) {
    await SpotlightSlide.updateOne(
      { srcPath: slide.srcPath },
      {
        $set: {
          title: slide.title,
          type: 'image',
          srcPath: slide.srcPath,
          posterPath: undefined,
          order: slide.order,
          durationSeconds: 5,
          isActive: true,
          tags: ['main', 'slide'],
        },
      },
      { upsert: true }
    )
  }

  const activeSlides = await SpotlightSlide.find({ isActive: true }).sort({ order: 1 }).lean()
  console.log(`Updated spotlight slides: ${activeSlides.length}`)
  console.log(activeSlides.map(slide => `${slide.order}. ${slide.srcPath}`).join('\n'))
}

main()
  .catch((error) => {
    console.error('Failed to set spotlight slides:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
