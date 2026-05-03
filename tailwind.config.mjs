import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,js,jsx,ts,tsx,md,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Noto Sans SC', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [typography]
};
