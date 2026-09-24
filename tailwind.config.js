// tailwind.config.js
const {heroui} = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/components/(date-picker|button|ripple|spinner|calendar|date-input|form|popover).js",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F6F1",
        "soft-canvas": "#F8F6F1",
        cinnamon: "#A2694E",
        "cinnamon-bronze": "#A2694E",
        charcoal: "#1E1B18",
        "deep-charcoal": "#1E1B18",
        sage: "#8B9B88",
        "muted-sage": "#8B9B88",
        sand: "#E6E0D5",
        "warm-sand": "#E6E0D5",
        linen: "#E6E0D5",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};