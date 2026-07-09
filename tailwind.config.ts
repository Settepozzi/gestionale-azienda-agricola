import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f1",
          100: "#dcf0de",
          200: "#bbe1c0",
          300: "#8dca97",
          400: "#57ac67",
          500: "#358f47",
          600: "#257237",
          700: "#1f5b2e",
          800: "#1c4928",
          900: "#183c23",
        },
      },
    },
  },
  plugins: [],
};

export default config;
