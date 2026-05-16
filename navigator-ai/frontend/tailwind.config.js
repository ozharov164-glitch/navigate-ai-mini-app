/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#020617",
          900: "#0a0f1f",
          850: "#0f1729",
          800: "#141c2e",
        },
        electric: {
          DEFAULT: "#22d3ee",
          dim: "#0891b2",
          muted: "#67e8f9",
        },
        premium: {
          DEFAULT: "#f5c842",
          light: "#fde68a",
          dim: "#d4a017",
        },
        brand: { DEFAULT: "#22d3ee", light: "#67e8f9", dark: "#0891b2" },
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.25)",
        "glow-gold": "0 0 28px rgba(245, 200, 66, 0.35)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.35)",
        card: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-dark":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,211,238,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(99,102,241,0.08), transparent)",
        "premium-gold": "linear-gradient(135deg, #fde68a 0%, #f5c842 50%, #d4a017 100%)",
        "accent-cyan": "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.45s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-up-stagger": "slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.92)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        pulseRing: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.15)", opacity: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
