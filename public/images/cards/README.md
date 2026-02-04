# Card Images for Drop Page

Put card image files under `public/images/cards/` using the folders below.

## Folder structure

- `public/images/cards/year`
- `public/images/cards/special`
- `public/images/cards/signature`
- `public/images/cards/material`
- `public/images/cards/prestige`

## Code map

### Member code

- `HAN` = 강한울
- `JAE` = 정재원
- `JIN` = 정진규
- `LEE` = 이승찬
- `MIN` = 정민석

### Year code

- `21` = 2021
- `22` = 2022
- `23` = 2023
- `24` = 2024
- `25` = 2025

## Current naming rules (recommended)

- Year card: `{MEMBER}_{YY}_V{1|2}.jpg`  
  - Example: `HAN_24_V1.jpg`
- Year pre-open BG: `BG_{YYYY}.jpg`  
  - Example: `BG_2024.jpg`
- Signature card: `SIG_{MEMBER}_{YY}.jpg`  
  - Example: `SIG_JAE_25.jpg`
- Signature pre-open BG: `BG_SIGNATURE.jpg`
- Special card: free format in `special/` (ex: `SC_HAN_23.jpg`, `BACKNUM_JAE.jpg`)
- Special pre-open BG: `BG_SPECIAL.jpg`
- Prestige card image: `BG_{MEMBER}_PRE.jpg`
- Prestige group image: `PGBG.jpg`

BG files are used as the image shown before "카드 열기" in the drop modal.

## Default fallback image

- Runtime fallback: `public/images/default-music-cover.jpg`
- Optional card-specific fallback: `public/images/cards/default.jpg`
