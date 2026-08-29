/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        drive: {
          bg: "#000000",
          surface: "#0a0a0c",
          hover: "#141418",
          active: "#1e1e24",
          border: "#18181c",
          text: "#ffffff",
          muted: "#71717a",
          accent: "#ff2b38",
          accentBg: "#ff2b38",
          selection: "#26080b",
        },
        mega: {
          DEFAULT: "#ff2b38",
          dark: "#d91e2a",
          light: "#ff525e",
          bg: "#1c0709",
          border: "#3d0e12",
        },
        filen: {
          DEFAULT: "#ff2b38",
          dark: "#d91e2a",
          light: "#ff525e",
          bg: "#1c0709",
          border: "#3d0e12",
        },
      },
    },
  },
  plugins: [],
};
