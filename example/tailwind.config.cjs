const flowbitePlugin = require('flowbite/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
    '../src/**/*.{js,jsx,ts,tsx}',  // Library source files
    './node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
    './node_modules/flowbite/**/*.js',
  ],
  safelist: [
    // Safelist all arbitrary-value classes used in the library
    { pattern: /(bg|text|border|placeholder)-\[#[^\]]+\]/, variants: ['hover', 'focus', 'disabled'] },
    'bg-[#131418]','bg-[#1B1C22]','border-[#272830]','text-[#EEEEF0]','text-[#7C7A85]',
    'bg-[#262626]','border-[#333]','text-[#888]','text-[#ef4444]','text-[#6bc36b]','border-t-[#2C64F8]',
    'text-[#A7A7A7]','hover:bg-[#1B1C22]','hover:text-[#EEEEF0]','focus:border-[#2C64F8]',
    'hover:bg-[#1E56E8]','bg-[#2C64F8]','text-[16px]','text-[14px]','text-[12px]',
    'bg-black/70','bg-red-500/10','bg-green-500/10','border-[#EEEEF0]/30','border-t-[#EEEEF0]'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Elza', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      colors: {
        silicongray: {
          50: '#F3F3F3',
          100: '#E6E6E6',
          200: '#C9C9C9',
          300: '#A7A7A7',
          400: '#7D7D7D',
          500: '#666666',
          600: '#4D4D4D',
          700: '#363636',
          800: '#252525',
          900: '#141414',
        },
        wasabi: {
          900: '#222C04',
          800: '#435708',
          700: '#65830B',
          600: '#86AE0F',
          500: '#A2D212',
          400: '#B9E142',
          300: '#CBE971',
          200: '#DCF0A1',
          100: '#EEF8D0',
          50: '#F6FBE7',
        },
        'page-bg': '#0D0D0D',
        'text-primary': 'white',
        'text-secondary': '#A7A7A7',
        'text-tertiary': '#7D7D7D',
        'card-bg-primary': '#141414',
        'card-bg-secondary': '#252525',
        'card-bg-tertiary': '#363636',
        'card-stroke-primary': '#363636',
        'input-bg': '#252525',
        'input-stroke': '#363636',
        highlight: '#B9E142',
      },
      borderRadius: {
        widget: '0.25rem',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [
    flowbitePlugin,
    function ({ addComponents }) {
      addComponents({
        '.widget-card': {
          borderRadius: '0.375rem',
        },
      });
    },
  ],
};

