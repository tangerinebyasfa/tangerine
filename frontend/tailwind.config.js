/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        ink: "#111111",
        tangerine: {
          DEFAULT: "#FF6A00",
          light: "#FF8A3D",
          dark: "#D95500",
        },
        burgundy: {
          DEFAULT: "#FF6A00",
          light: "#FF8A3D",
          dark: "#D95500",
        },
        sage: "#6B7256",
        sand: "#FFF1E6",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
    },
  },
  plugins: [],
};
