import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        // COSOV. brand palette: warm cream + burgundy
        stone: {
          50: '#FAF6F1',   // lightest cream (page backgrounds)
          100: '#F5EDE3',  // cream (card hover, subtle bg)
          200: '#E8DDD0',  // warm border
          300: '#D4C4B0',  // muted border
          400: '#B8A48E',  // placeholder text
          500: '#96806A',  // muted text
          600: '#7A644E',  // secondary text
          700: '#5E4A38',  // body text
          800: '#3D2B1E',  // dark brown
          900: '#5B1A1A',  // burgundy (headings, buttons, brand)
          950: '#3D1111',  // deep burgundy
        },
      },
    },
  },
  plugins: [],
};

export default config;
