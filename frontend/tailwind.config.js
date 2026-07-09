/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0a0a14',
        darkcard: 'rgba(20, 20, 35, 0.45)',
        brandBlue: '#3b82f6',
        brandPurple: '#a855f7',
        brandIndigo: '#6366f1',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        glassBorderActive: 'rgba(255, 255, 255, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
}
