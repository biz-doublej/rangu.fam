# Custom Icons for Rangu.fam Wiki

This folder contains custom image icons that can be used in the wiki system using the `!icon:{name}` syntax.

## Supported Icons (13 total)

The following icons are supported and should be placed in this folder as PNG files:

### Country/Region Icons
- `swiss.png` - Switzerland flag/icon
- `usa.png` - USA flag/icon  
- `canada.png` - Canada flag/icon
- `korea.png` - Korea flag/icon

### Military/Service Icons
- `army.png` - Army/military icon
- `ir2.png` - IR2 service icon
- `ir.png` - IR service icon

### Social Media Icons
- `linkedin.png` - LinkedIn icon
- `soundcloud.png` - SoundCloud icon
- `github.png` - GitHub icon
- `youtube.png` - YouTube icon
- `insta.png` - Instagram icon

### General Icons
- `web.png` - Web/website icon

## Usage in Wiki

Use these icons in your wiki content with the following syntax:

```wiki
!icon:{swiss}
!icon:{usa}
!icon:{canada}
!icon:{korea}
!icon:{army}
!icon:{ir2}
!icon:{ir}
!icon:{linkedin}
!icon:{soundcloud}
!icon:{github}
!icon:{youtube}
!icon:{web}
!icon:{insta}
```

## Icon Options

You can also specify size and styling options:

```wiki
!icon:{korea,size:24}
!icon:{github,size:20,class:mr-2}
```

## File Format Requirements

- **Format**: PNG recommended (supports transparency)
- **Size**: Recommended 64x64px or higher for best quality
- **Naming**: Exact filename must match the icon name (case-sensitive)
- **Location**: Must be placed directly in this folder

## Examples in Different Contexts

### In Tables
```wiki
|| Country || Icon ||
|| Switzerland || !icon:{swiss} ||
|| USA || !icon:{usa} ||
|| Canada || !icon:{canada} ||
|| Korea || !icon:{korea} ||
```

### In Templates
```wiki
{{인물정보상자
|이름 = 정재원
|국적 = !icon:{korea} 대한민국
|소속 = !icon:{army} 군인
|링크 = !icon:{github} GitHub | !icon:{linkedin} LinkedIn
}}
```

### In Links
```wiki
- !icon:{github} [[GitHub 프로필|https://github.com/username]]
- !icon:{linkedin} [[LinkedIn|https://linkedin.com/in/username]]
- !icon:{youtube} [[YouTube 채널|https://youtube.com/@channel]]
```

## Technical Details

- Icons are served from `/images/icons/` path
- Custom icons take priority over Lucide icons
- Fallback to question mark icon if image fails to load
- Supports all standard HTML img attributes through className
- Compatible with existing WikiIcon syntax and options

## Adding New Icons

To add new icons beyond the supported 13:

1. Add the icon name to `CUSTOM_IMAGE_ICONS` array in `src/components/ui/WikiIcon.tsx`
2. Place the PNG file in this folder with the exact name
3. Update this README to document the new icon

**Note**: Currently limited to exactly 13 icons as specified.