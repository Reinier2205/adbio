/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        base: ['17px', '1.47'], // iOS body
        lg: ['20px', '1.4'],   // iOS callout
        xl: ['28px', '1.2'],   // iOS title2
        '2xl': ['34px', '1.1'], // iOS large title
        sm: ['15px', '1.4'],   // iOS subheadline
        xs: ['13px', '1.3'],   // iOS caption
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
  },
  plugins: [],
};
