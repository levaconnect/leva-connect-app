/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7052C8",
          light: "#BBA5F5",
        },
        secondary: {
          DEFAULT: "#FF897D",
        },
        accent: {
          DEFAULT: "#9ADCC3",
        },
        background: {
          DEFAULT: "#FAF8F2",
          dark: "#21172F",
        },
        text: {
          primary: "#282331",
          secondary: "#827B8B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          elevated: "#FAF8F2",
        },
        border: "#E8E2F0",
      },
      fontFamily: {
        heading: ["System", "sans-serif"],
        body: ["System", "sans-serif"],
      },
      spacing: {
        4.5: "1.125rem",
        13: "3.25rem",
        18: "4.5rem",
      },
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(33, 23, 47, 0.08)",
        "card": "0 4px 16px rgba(33, 23, 47, 0.1)",
        "elevated": "0 8px 32px rgba(33, 23, 47, 0.12)",
      },
    },
  },
  plugins: [],
};