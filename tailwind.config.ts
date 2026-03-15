import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { poppins: ["var(--font-poppins)", "sans-serif"] },
      colors: {
        brand: "#6366F1",
        "brand-hover": "#4F46E5",
        "brand-light": "#EEF2FF",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        border: "#E4E4E7",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#F43F5E",
        "text-primary": "#18181B",
        "text-secondary": "#71717A",
      },
      borderRadius: { xl: "12px", "2xl": "16px" },
      boxShadow: {
        card: "0 1px 3px rgb(0 0 0 / 0.08)",
        "card-hover": "0 4px 12px rgb(0 0 0 / 0.1)",
        dropdown: "0 8px 24px rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
