/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marigold: {
          DEFAULT: "#f4ae35",
          glow: "#ffd06a",
          dark: "#b8731b",
        },
        spirit: {
          dark: "#171416",
          card: "#211d1e",
          border: "#453936",
          muted: "#a69b94",
        },
      },
      boxShadow: {
        candle: "0 0 42px rgba(244, 174, 53, 0.08)",
      },
    },
  },
  plugins: [],
};