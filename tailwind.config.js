import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        primary: {
          50: 'hsl(96, 44%, 95%)',
          100: 'hsl(96, 44%, 90%)',
          200: 'hsl(96, 44%, 80%)',
          300: 'hsl(96, 44%, 70%)',
          400: 'hsl(96, 44%, 60%)',
          500: 'hsl(96, 44%, 42%)',
          600: 'hsl(96, 44%, 35%)',
          700: 'hsl(96, 44%, 28%)',
          800: 'hsl(96, 44%, 21%)',
          900: 'hsl(96, 44%, 14%)',
        },
      },
      backgroundImage: {
        'gradient-light': 'linear-gradient(135deg, white 0%, hsl(120, 14%, 99%) 100%)',
        'gradient-dark': 'linear-gradient(135deg, hsl(60, 2%, 8%) 0%, hsl(93, 19%, 11%) 100%)',
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}

module.exports = config;