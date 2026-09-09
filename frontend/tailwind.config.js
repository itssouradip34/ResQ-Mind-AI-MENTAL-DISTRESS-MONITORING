/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        resq: {
          blue: "#1E3A8A",
          teal: "#0D9488",
          amber: "#D97706",
          rose: "#E11D48",
          slate: "#0F172A",
          bg: "#F8FAFC"
        }
      }
    },
  },
  plugins: [],
}
