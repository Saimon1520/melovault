/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // MeloVault Design System
        'mv-black': '#080810',
        'mv-surface-0': '#0E0E16',
        'mv-surface-1': '#14141F',
        'mv-surface-2': '#1C1C28',
        'mv-surface-3': '#242432',
        'mv-accent': '#7C5CFC',
        'mv-accent-dim': '#4A3899',
        'mv-success': '#00C9A7',
        'mv-warning': '#FFB347',
        'mv-error': '#FF6B6B',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
