/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
   content: ['./*.{html,js}'],
    theme: {
      extend: {
        animation: {
          'animate-border': 'border-color-run 5s linear infinite',
        },
        keyframes: {
          'border-color-run': {
            '0%': { 'border-left-color': 'transparent' },
            '100%': { 'border-right-color': 'transparent' },
          },
        }, 
      },
      
    },
    plugins: [
      require('tailwindcss-scrollbar'),
    ],
    darkMode:"class"
  }