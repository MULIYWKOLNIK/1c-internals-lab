/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: v('--c-bg'),
        surface: v('--c-surface'),
        elevated: v('--c-elevated'),
        line: v('--c-line'),
        line2: v('--c-line2'),
        fg: v('--c-fg'),
        muted: v('--c-muted'),
        faint: v('--c-faint'),
        accent: v('--c-accent'),
        ok: v('--c-ok'),
        warn: v('--c-warn'),
        danger: v('--c-danger'),
        violet: v('--c-violet'),
        cyan: v('--c-cyan'),
        amber: v('--c-amber'),
      },
      boxShadow: {
        panel: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
        pop: '0 24px 64px -24px rgb(0 0 0 / 0.45)',
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-accent) / 0.45)' },
          '100%': { boxShadow: '0 0 0 14px rgb(var(--c-accent) / 0)' },
        },
        dash: { to: { strokeDashoffset: '-32' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 1.4s ease-out infinite',
        dash: 'dash 1s linear infinite',
        'fade-up': 'fadeUp .28s ease-out both',
      },
    },
  },
  plugins: [],
}
