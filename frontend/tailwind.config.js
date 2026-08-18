/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    "bg-tangerine",
    "bg-tangerine/90",
    "bg-ink",
    "bg-paper",
    "bg-sand",
    "bg-sage/20",
    "bg-burgundy/10",
    "bg-green-100",
    "bg-red-100",
    "text-paper",
    "text-ink",
    "text-burgundy",
    "text-sage",
    "text-green-700",
    "text-red-700",
    "border-ink/10",
    "border-ink/20",
    "rotate-180",
    "sm:w-auto",
    "md:block",
    "md:hidden",
    "md:flex",
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
