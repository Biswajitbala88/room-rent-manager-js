/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        mint: '#2f9e8f',
        coral: '#db6b58',
        steel: '#516170',
      },
    },
  },
  plugins: [],
};
