/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05080d",
          900: "#0a0f18",
          850: "#0d1420",
          800: "#111a28",
          700: "#182333",
          600: "#22314a",
          500: "#2f4260",
        },
        accent: {
          DEFAULT: "#22d3ee",
          dim: "#0e7490",
          soft: "#67e8f9",
        },
        warn: {
          DEFAULT: "#f59e0b",
          dim: "#92400e",
        },
        crit: {
          DEFAULT: "#ef4444",
          dim: "#7f1d1d",
        },
        safe: {
          DEFAULT: "#22c55e",
          dim: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -8px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
