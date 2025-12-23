Branding and Theme

- Config: `src/config/branding.ts`
- Keys:
  - `brandSite`: Site-wide short name (e.g., Rangu.fam)
  - `brandWiki`: Wiki brand display name (e.g., 이랑위키)
  - `accents`: Common Tailwind accent tokens

Usage

- Import `BRANDING` and reference `BRANDING.brandWiki` in UI components.
- Example: header in Wiki pages uses `BRANDING.brandWiki` instead of hardcoded text.
