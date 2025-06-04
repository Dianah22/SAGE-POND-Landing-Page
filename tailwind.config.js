/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
     './client/*.{html,js}',
     './client/admin/**/*.{html,js}',
     './client/js/*.js',
     './client/admin/src/*.js'
   ],
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
        typography: {
          DEFAULT: {
            css: {
              maxWidth: 'none',
              color: '#1f2937',
              'h1,h2,h3,h4,h5,h6': {
                color: '#111827',
                marginTop: '2em',
                marginBottom: '1em'
              },
              'a': {
                color: '#3182ce',
                '&:hover': {
                  color: '#2c5282'
                }
              }
            }
          }
        }
      },
    },
    plugins: [
      require('tailwindcss-scrollbar'),
      require('@tailwindcss/typography'),
    ],
    darkMode: "class"
}