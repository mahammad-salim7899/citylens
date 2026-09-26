/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0B1220',
          900: '#0F172A',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        civic: {
          950: '#0A1130',
          900: '#101A3D',
          800: '#152052',
          700: '#1E2A6B',
          600: '#28348A',
          500: '#3548B4',
          400: '#5A6BCB',
          300: '#A3AEE6',
          200: '#C9D0F2',
          100: '#E7EAF9',
          50: '#F4F5FC',
        },
        signal: {
          teal: '#0F766E',
          tealLight: '#CCFBF1',
          green: '#15803D',
          greenLight: '#DCFCE7',
          amber: '#B45309',
          amberLight: '#FEF3C7',
          red: '#B91C1C',
          redLight: '#FEE2E2',
        },
      },
      spacing: {
        4.5: '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 26, 61, 0.06), 0 6px 20px -8px rgba(16, 26, 61, 0.12)',
        lift: '0 2px 4px rgba(16, 26, 61, 0.06), 0 16px 40px -16px rgba(16, 26, 61, 0.25)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up 280ms ease-out both',
      },
    },
  },
  plugins: [],
}
