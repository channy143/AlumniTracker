/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ctu: {
          blue: '#003366',
          gold: '#D4AF37',
          marigold: '#E8A050',
          warm: '#FAFAFA',
          charcoal: '#2D3748',
          teal: '#38B2AC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
