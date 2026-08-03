/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.html", "./static/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
          950: "#1e1b4b",
        },
      },
      keyframes: {
        "border-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "shine": {
          "0%": { backgroundPosition: "0% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "border-spin": "border-spin 4s linear infinite",
        "shine": "shine 3s linear infinite",
      },
    },
  },
  plugins: [],
};
