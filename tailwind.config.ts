import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy (used by wiki — keep)
        primary: {
          50: '#e6f2ff',
          100: '#b3d9ff',
          200: '#80bfff',
          300: '#4da6ff',
          400: '#1a8cff',
          500: '#0066cc',
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.8)',
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(0, 0, 0, 0.1)',
        },
        warm: {
          50: '#fefcf9',
          100: '#fdf6ed',
          200: '#fbe9d3',
          300: '#f8d4a8',
          400: '#f4b96c',
          500: '#f09e30',
          600: '#e68900',
          700: '#c06d00',
          800: '#9b5600',
          900: '#7a4400',
        },

        // Rangu.fam scrapbook palette
        paper: {
          50: '#FBF7EE',
          100: '#F8F1E5',
          200: '#F2E8D4',
          300: '#E8DAB9',
          400: '#D4C39A',
          500: '#B8A47A',
          900: '#3A3024',
        },
        ink: {
          50: '#F2EDE3',
          100: '#D6CCBA',
          200: '#9C8E78',
          300: '#6E5E48',
          400: '#473A28',
          500: '#2B2118',
          600: '#1B130A',
          900: '#0F0A04',
        },
        coral: {
          400: '#EE8569',
          500: '#E0654E',
          600: '#C44E36',
        },
        sage: {
          400: '#6F8973',
          500: '#3E5C4A',
          600: '#2D4435',
        },
        mustard: {
          400: '#E2B047',
          500: '#C28A2D',
          600: '#9A6C20',
        },
        washi: {
          yellow: 'rgba(255, 228, 168, 0.85)',
          coral: 'rgba(238, 133, 105, 0.7)',
          sage: 'rgba(111, 137, 115, 0.65)',
          paper: 'rgba(255, 252, 244, 0.9)',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['var(--font-han)', 'Pretendard', 'sans-serif'],
        hand: ['var(--font-gaegu)', 'var(--font-caveat)', 'cursive'],
        caveat: ['var(--font-caveat)', 'cursive'],
        serif: ['Gowun Batang', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundColor: {
        'glass-white': 'rgba(255, 255, 255, 0.8)',
        'glass-light': 'rgba(255, 255, 255, 0.1)',
        'glass-medium': 'rgba(255, 255, 255, 0.2)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.3)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4)',
        'soft': '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
        'polaroid': '0 1px 1px rgba(0,0,0,0.04), 0 6px 20px -8px rgba(43, 33, 24, 0.35), 0 18px 40px -12px rgba(43, 33, 24, 0.25)',
        'paper': '0 1px 0 rgba(43, 33, 24, 0.04), 0 4px 14px -8px rgba(43, 33, 24, 0.18)',
        'tape': '0 2px 6px -2px rgba(180, 140, 60, 0.4)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide': 'slide 20s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'sway': 'sway 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slide: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(var(--rot, -1deg))' },
          '50%': { transform: 'rotate(calc(var(--rot, -1deg) + 0.6deg))' },
        },
      }
    },
  },
  plugins: [],
}
export default config
