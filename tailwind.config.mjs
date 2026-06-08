import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,js,jsx,ts,tsx,md,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Noto Sans SC', 'system-ui', 'sans-serif']
      },
      colors: {
        morandi: {
          bg: '#F4F3EF',
          card: '#FFFFFF',
          text: '#3D404A',
          muted: '#8A8F99',
          accent: '#8E9B8E',
          'accent-hover': '#737D73',
          'tag-bg': '#EAE8E1',
          border: '#E0DDD5',
          'dark-bg': '#1A1C20',
          'dark-card': '#25272D',
          'dark-text': '#E5E5E5',
          'dark-accent': '#7A8B7A',
          'dark-tag-bg': '#2D2F35',
          'dark-border': '#33353B',
        }
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: [typography]
};
