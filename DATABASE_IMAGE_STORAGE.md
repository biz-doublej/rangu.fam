# Database-Based Image Storage System

## Overview

This document describes the new database-based image storage system implemented to address Vercel's storage limitations. Instead of storing images as files on the filesystem, images are now stored as base64-encoded data directly in MongoDB.

## Benefits

- ✅ **No Vercel storage limits**: Images are stored in MongoDB, not in Vercel's file system
- ✅ **Centralized management**: All images in one database with metadata
- ✅ **Better organization**: Images categorized by type (wiki, music, profile, general)
- ✅ **Easier deployment**: No need to manage file uploads across deployments
- ✅ **Backup friendly**: Images included in database backups

## Components

### 1. Database Model (`/src/models/Image.ts`)

```typescript
interface IImage {
  filename: string        // Unique filename
  originalName: string    // Original upload name
  mimeType: string       // image/jpeg, image/png, etc.
  size: number           // File size in bytes
  data: string          // Base64 encoded image data
  uploadedBy: string    // Username
  uploadedById: string  // User ID
  category: string      // 'profile', 'wiki', 'music', 'general'
  description?: string  // Optional description
  isPublic: boolean     // Public/private flag
  createdAt: Date
  updatedAt: Date
}
```

### 2. API Endpoints

#### Upload Images (`POST /api/images`)
- Upload images with category and metadata
- Returns image URL for immediate use
- Supports multiple categories

#### Serve Images (`GET /api/images/serve/[filename]`)
- Serves images from database
- Proper caching headers
- Content-Type handling

#### List Images (`GET /api/images`)
- Get user's uploaded images
- Supports pagination and filtering
- Excludes base64 data for performance

### 3. Updated Upload Routes

#### Wiki Upload (`/api/wiki/files/upload`)
- Now stores images in database instead of filesystem
- Maintains compatibility with existing wiki editor

#### Music Upload (`/api/tracks/upload`)
- Cover images stored in database
- Audio files still stored in filesystem (separate issue)

### 4. React Component (`ImageUpload`)

A reusable component for image uploads:

```tsx
import { ImageUpload } from '@/components/ui'

<ImageUpload
  category="wiki"
  onUpload={(url, data) => console.log('Uploaded:', url)}
  onError={(error) => console.error('Error:', error)}
  maxSize={5 * 1024 * 1024} // 5MB
/>
```

## Usage Examples

### Basic Image Upload

```javascript
const formData = new FormData()
formData.append('file', imageFile)
formData.append('category', 'wiki')
formData.append('isPublic', 'true')

const response = await fetch('/api/images', {
  method: 'POST',
  body: formData,
  credentials: 'include'
})

const result = await response.json()
if (result.success) {
  console.log('Image URL:', result.url)
}
```

### Displaying Images

Images can be displayed using the returned URL:

```html
<img src="/api/images/serve/wiki_123e4567-e89b-12d3-a456-426614174000.jpg" alt="Image" />
```

## Migration Notes

### Existing Images

- Old file-based images will continue to work
- New uploads will use database storage
- Consider migrating existing images gradually

### File Size Considerations

- 5MB limit per image (configurable)
- Base64 encoding increases storage by ~33%
- Monitor database size growth

### Performance

- Images served with caching headers (1 year cache)
- Consider CDN for high-traffic scenarios
- Database queries optimized with indexes

## Configuration

### Environment Variables

No additional environment variables required. Uses existing MongoDB connection.

### Size Limits

```typescript
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
```

### Allowed Formats

```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]
```

## Future Improvements

1. **Image optimization**: Resize/compress images before storage
2. **CDN integration**: Serve images through CDN for better performance
3. **Lazy loading**: Implement progressive image loading
4. **Thumbnail generation**: Create thumbnails for faster loading
5. **Image gallery**: Build management interface for uploaded images

## Troubleshooting

### Common Issues

1. **"파일이 너무 큽니다"**: File exceeds 5MB limit
2. **"로그인이 필요합니다"**: User not authenticated
3. **"허용되지 않는 파일 형식"**: Unsupported image format

### Debug Steps

1. Check browser network tab for error responses
2. Verify user authentication status
3. Confirm file size and format
4. Check server logs for detailed errors

## Security Considerations

- Images are scoped to authenticated users
- MIME type validation prevents malicious uploads
- File size limits prevent storage abuse
- Public/private flags control access