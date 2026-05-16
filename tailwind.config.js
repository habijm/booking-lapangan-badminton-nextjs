/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        court: {
          green: '#2D6A4F',
          'green-light': '#40916C',
          'green-pale': '#D8F3DC',
          lime: '#74C69D',
          cream: '#F8F9F0',
          shuttle: '#F4A261',
          'shuttle-dark': '#E76F51',
          charcoal: '#1B2028',
          'gray-soft': '#F1F5F4',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateX(-8px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'court': '0 4px 24px rgba(45, 106, 79, 0.12)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
