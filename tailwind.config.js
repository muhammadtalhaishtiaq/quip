/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F8F6F4',
          100: '#F1EBE7',
          200: '#E7DFD8',
          400: '#C4AFA0',
          600: '#6B5751',
          700: '#5A4843',
          900: '#3D2817',
        },
        amber: {
          50: '#FFFBF0',
          100: '#FEF3E2',
          400: '#FBBF24',
          500: '#F59E0B',
        },
        emerald: {
          50: '#F0FDF4',
          400: '#4ADE80',
          500: '#10B981',
        },
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          900: '#0F172A',
        },
      },
    },
  },
  plugins: [],
}
