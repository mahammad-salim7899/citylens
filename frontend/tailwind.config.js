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
      // ── Motion ─────────────────────────────────────────────────────
      // One easing curve for almost everything (fast start, soft landing)
      // so the whole app moves with the same "feel". Delays come from a
      // --d CSS variable set inline, e.g. style={{ '--d': '120ms' }}.
      //
      // Entrance animations move the individual `translate` / `scale`
      // properties, NOT `transform`. A finished animation with fill-mode
      // `both` keeps its last value, so animating `transform` would pin it
      // and silently cancel hover lifts (hover:-translate-y-*) on the same
      // element. The separate properties compose with transform instead.
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, translate: '0 6px' }, '100%': { opacity: 1, translate: 'none' } },
        rise: { '0%': { opacity: 0, translate: '0 14px' }, '100%': { opacity: 1, translate: 'none' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'scale-in': { '0%': { opacity: 0, scale: '0.96' }, '100%': { opacity: 1, scale: 'none' } },
        'page-in': { '0%': { opacity: 0, translate: '0 8px' }, '100%': { opacity: 1, translate: 'none' } },
        'slide-down': { '0%': { opacity: 0, translate: '0 -8px' }, '100%': { opacity: 1, translate: 'none' } },
        pop: {
          '0%': { opacity: 0, scale: '0.4' },
          '60%': { opacity: 1, scale: '1.12' },
          '100%': { opacity: 1, scale: 'none' },
        },
        'toast-out': { '0%': { opacity: 1, translate: 'none', scale: 'none' }, '100%': { opacity: 0, translate: '0 -6px', scale: '0.98' } },
        'toast-timer': { '0%': { transform: 'scaleX(1)' }, '100%': { transform: 'scaleX(0)' } },
        'grow-x': { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
        'grow-y': { '0%': { transform: 'scaleY(0)' }, '100%': { transform: 'scaleY(1)' } },
        sweep: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        ripple: { '0%': { opacity: 0, scale: '1' }, '15%': { opacity: 0.55 }, '100%': { opacity: 0, scale: '1.7' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'dash-flow': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '8px 0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      animation: {
        'fade-up': 'fade-up 280ms ease-out both',
        rise: 'rise 640ms cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) both',
        'fade-in': 'fade-in 500ms ease-out var(--d, 0ms) both',
        'scale-in': 'scale-in 560ms cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) both',
        'page-in': 'page-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slide-down 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 420ms cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) both',
        'toast-out': 'toast-out 180ms ease-in both',
        'grow-x': 'grow-x 1100ms cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) both',
        'grow-y': 'grow-y 700ms cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) both',
        sweep: 'sweep 1.1s cubic-bezier(0.65, 0, 0.35, 1) var(--d, 0ms) both',
        'sweep-loop': 'sweep 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        ripple: 'ripple 1.6s ease-out var(--d, 0ms) 2 both',
        shimmer: 'shimmer 1.8s linear infinite',
        'dash-flow': 'dash-flow 900ms linear infinite',
        float: 'float 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
