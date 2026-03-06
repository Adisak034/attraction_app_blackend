/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'faith-gold': '#D4AF37',
        'faith-cream': '#F5F5DC',
        'faith-dark': '#1A1A1A',
        'faith-burgundy': '#4A0E0E',
        'faith-accent': '#8B0000',
      },
      fontFamily: {
        outfit: ['IBM Plex Sans Thai Looped', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
