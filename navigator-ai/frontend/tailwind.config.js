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
        midnight: {
          DEFAULT: "#0A0F1C",
          950: "#060910",
          900: "#0A0F1C",
          850: "#0E1526",
          800: "#121B2E",
          700: "#1A2438",
        },
        mint: {
          DEFAULT: "rgb(0 229 201 / <alpha-value>)",
          muted: "rgb(92 235 217 / <alpha-value>)",
          dim: "rgb(0 184 163 / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(255 184 0 / <alpha-value>)",
          light: "rgb(255 213 79 / <alpha-value>)",
          dim: "rgb(230 166 0 / <alpha-value>)",
        },
        surface: {
          DEFAULT: "#F4F6FA",
          elevated: "#FFFFFF",
          muted: "#E8ECF4",
        },
        navy: {
          950: "#060910",
          900: "#0A0F1C",
          850: "#0E1526",
          800: "#121B2E",
        },
        premium: {
          DEFAULT: "rgb(255 184 0 / <alpha-value>)",
          light: "rgb(255 213 79 / <alpha-value>)",
          dim: "rgb(230 166 0 / <alpha-value>)",
        },
      },
      boxShadow: {
        glow: "0 0 32px rgba(0, 229, 201, 0.18)",
        "glow-sm": "0 0 16px rgba(0, 229, 201, 0.12)",
        "glow-gold": "0 0 32px rgba(255, 184, 0, 0.28)",
        glass: "0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        "glass-sm": "0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        card: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        volumetric: "0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)",
      },
      backgroundImage: {
        "mesh-dark":
          "radial-gradient(ellipse 90% 60% at 50% -25%, rgba(0, 229, 201, 0.07) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(255, 184, 0, 0.04) 0%, transparent 50%)",
        "mesh-light":
          "radial-gradient(ellipse 80% 50% at 50% -15%, rgba(0, 229, 201, 0.12) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 100% 100%, rgba(255, 184, 0, 0.06) 0%, transparent 45%)",
        "premium-gold": "linear-gradient(135deg, #FFD54F 0%, #FFB800 45%, #E6A600 100%)",
        "accent-teal": "linear-gradient(135deg, #5CEBD9 0%, #00E5C9 50%, #00B8A3 100%)",
        "glass-shine": "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-up-stagger": "slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in": "scaleIn 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) forwards",
        shimmer: "shimmer 2s ease-in-out infinite",
        "pulse-ring": "pulseRing 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        glow: "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.94)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.7" },
        },
        pulseRing: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.5" },
          "50%": { transform: "scale(1.12)", opacity: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 229, 201, 0.15)" },
          "50%": { boxShadow: "0 0 28px rgba(0, 229, 201, 0.28)" },
        },
      },
    },
  },
  plugins: [],
};
