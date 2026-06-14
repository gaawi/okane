import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf3",
          100: "#d6f7e1",
          200: "#b0edc7",
          300: "#7cdda6",
          400: "#43c47f",
          500: "#1fa862",
          600: "#12874e",
          700: "#106b41",
          800: "#115537",
          900: "#0f462f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
