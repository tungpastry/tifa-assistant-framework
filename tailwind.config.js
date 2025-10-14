/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media", // hoặc "class" nếu muốn toggle thủ công
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};



