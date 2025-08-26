# 🎉 New Wiki Features Demo

This document demonstrates the newly implemented features for the Rangu.fam wiki system.

## ✨ Feature 1: Icon Loading System

The wiki now supports icon loading using the `!icon:{name}` syntax with Lucide React icons.

### Icon Examples

**Basic Icons:**
- Home: !icon:{home}
- User: !icon:{user}
- Search: !icon:{search}
- Settings: !icon:{settings}
- Heart: !icon:{heart}
- Star: !icon:{star}

**Korean Icons:**
- 홈: !icon:{홈}
- 사용자: !icon:{사용자}
- 검색: !icon:{검색}
- 설정: !icon:{설정}
- 좋아요: !icon:{좋아요}
- 별: !icon:{별}

**Icons with Options:**
- Large icon: !icon:{home,size:24}
- Colored icon: !icon:{heart,color:red}
- With custom class: !icon:{star,class:text-yellow-400}
- Combined: !icon:{settings,size:20,color:blue,class:mr-2}

**Icons in Different Contexts:**

1. **In Tables:**
|| Feature || Status || Priority ||
|| Icon System || !icon:{check} Complete || !icon:{star} High ||
|| Image Upload || !icon:{check} Complete || !icon:{star} High ||
|| Documentation || !icon:{edit} In Progress || !icon:{minus} Medium ||

2. **In Templates:**
[[인포박스: 제목=Feature Status | 상태=!icon:{check} Complete | 우선순위=!icon:{star} High | 담당자=Development Team]]

3. **In Links:**
- [[Home|!icon:{home} Go to Home]]
- [[Settings|!icon:{settings} Configuration]]
- [External Link !icon:{external} https://example.com]

## 🖼️ Feature 2: Enhanced Image Insertion System

The image insertion system now supports cursor position-based insertion, allowing you to click anywhere and insert images at that exact location.

### How It Works

1. **Table Insertion**: Click in any table cell and upload an image - it will be inserted directly in that cell
2. **Template Insertion**: Click within templates (infoboxes, person templates) and images will be smartly inserted
3. **Block Insertion**: Click at the start of a line for block-level images
4. **Inline Insertion**: Click anywhere in text for inline images

### Test Cases

**1. Table Test:**
Click in any cell below and try uploading an image:

|| Column 1 || Column 2 || Column 3 ||
|| Click here to test image insertion || Another test cell || Third test cell ||
|| Table supports images now || !icon:{image} Images anywhere || Perfect! ||

**2. Template Test:**
{{인물정보상자
|이름 = Test Person
|이미지 = [Click to insert image here]
|출생 = 2024년
|직업 = Tester
|설명 = Testing the new image system
}}

**3. Infobox Test:**
[[인포박스: 제목=Image Test | 설명=Click anywhere to test | 이미지= | 상태=Testing]]

**4. Card Grid Test:**
[[카드그리드: items=[
  {
    "title": "Test Project",
    "image": "[Images can go here]",
    "description": "Testing image insertion",
    "date": "2024"
  }
]]]

### Technical Improvements

- **No More Restrictions**: Images can now be inserted anywhere, not just in specific blocks
- **Smart Detection**: The system automatically detects the best insertion method based on cursor position
- **Database Storage**: Continues to use the existing database-based storage system (not Vercel)
- **Real-time Preview**: See your changes immediately in the preview mode

## 🔧 Usage Instructions

### Icon System Usage

1. **Basic Syntax**: `!icon:{name}`
2. **With Size**: `!icon:{name,size:24}`
3. **With Color**: `!icon:{name,color:red}`
4. **With CSS Class**: `!icon:{name,class:custom-class}`
5. **Combined Options**: `!icon:{name,size:20,color:blue,class:mr-2}`

**Available Icon Names:**
- English: home, user, settings, search, edit, delete, save, close, menu, plus, minus, check, etc.
- Korean: 홈, 사용자, 설정, 검색, 편집, 삭제, 저장, etc.
- All Lucide React icons are supported by their exact names

### Enhanced Image System Usage

1. **Click Anywhere**: Position your cursor where you want the image
2. **Upload Image**: Use the "사진 선택" button or drag and drop
3. **Smart Insertion**: The system will automatically:
   - Insert inline if you're in text
   - Insert in table cells if you're in a table
   - Update template fields if you're in a template
   - Create block images if you're at line start

## 🎯 Testing Guidelines

### Icon Testing
- [ ] Test basic icon syntax in text
- [ ] Test icons in table cells
- [ ] Test icons in template fields
- [ ] Test icon options (size, color, class)
- [ ] Test Korean icon names
- [ ] Test icons in links and hyperlinks

### Image Testing
- [ ] Upload image while cursor is in table cell
- [ ] Upload image while cursor is in template field
- [ ] Upload image at start of line
- [ ] Upload image in middle of text
- [ ] Test with different template types
- [ ] Verify database storage is working

## 📝 Developer Notes

### Icon System Implementation
- Created `WikiIcon` component with comprehensive alias mapping
- Enhanced `parseInlineElements` in `NamuWikiRenderer` to support icon parsing
- Icons work in all wiki content: templates, tables, text, links

### Image System Implementation
- Removed restrictive `canInsertImageHere` logic
- Added smart `getImageInsertionInfo` function
- Enhanced `insertImageAtCursorPosition` for context-aware insertion
- Maintains compatibility with existing database storage

### Files Modified
1. `src/components/ui/WikiIcon.tsx` - New icon component
2. `src/components/ui/NamuWikiRenderer.tsx` - Enhanced with icon parsing
3. `src/components/ui/WikiEditor.tsx` - Enhanced image insertion system

## 🚀 What's Next

Both features are now fully implemented and ready for testing. The wiki system now provides:

1. **Rich Icon Support**: Enhance your content with icons using simple syntax
2. **Flexible Image Insertion**: Insert images exactly where you need them
3. **Improved User Experience**: More intuitive and powerful editing capabilities

Try out the features by editing this document or creating new wiki pages!