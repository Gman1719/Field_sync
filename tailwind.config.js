/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#0f172a',
        },
        navy: {
          50: '#f0f4fc',
          100: '#dbe5f7',
          200: '#bccff1',
          300: '#8eb3e7',
          400: '#5990db',
          500: '#3571cd',
          600: '#2456b6',
          700: '#1e4494',
          800: '#1e3a8a',
          900: '#1b326d',
          950: '#111f45',
        },
        slate: {
          DEFAULT: '#475569',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        app: '#F8FAFC',
        card: '#FFFFFF',
        main: '#0F172A',
        muted: '#64748B',
        border: '#E2E8F0',
        status: {
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
          info: '#0284C7',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        ethiopia: ['Noto Sans Ethiopic', 'Nyala', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'modal': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}