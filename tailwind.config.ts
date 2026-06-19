import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        ui: {
          bg: "#f5f6f8",
          panel: "#ffffff",
          subtle: "#eef1f5",
          "subtle-2": "#f8f9fb",
          text: "#1f2937",
          "text-soft": "#6b7280",
          primary: "#f97316",
          "primary-soft": "rgba(249, 115, 22, 0.12)",
          border: "#e2e5ea",
          danger: "#dc2626",
          success: "#16a34a",
          warning: "#f59e0b",
        },
      },
      borderRadius: {
        ui: "8px",
        "ui-lg": "10px",
      },
    },
  },
  plugins: [],
};

export default config;
