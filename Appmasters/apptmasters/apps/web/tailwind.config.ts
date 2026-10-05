import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
        },
        // Marketplace / landing palette
        pine: {
          50: "#EEF5F1",
          100: "#DCEBE3",
          200: "#B9D6C7",
          500: "#2E7D62",
          600: "#226B53",
          700: "#1D5C48",
          800: "#184C3C",
          900: "#123A2F",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
