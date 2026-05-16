/**
 * НавигаторAI — design tokens (dark-first premium)
 * Midnight navy + electric cyan + soft gold (premium)
 */

export const colors = {
  navy: {
    950: "#020617",
    900: "#0a0f1f",
    850: "#0f1729",
    800: "#141c2e",
    700: "#1e293b",
  },
  cyan: {
    DEFAULT: "#22d3ee",
    dim: "#0891b2",
    glow: "rgba(34, 211, 238, 0.35)",
  },
  gold: {
    DEFAULT: "#f5c842",
    light: "#fde68a",
    dim: "#d4a017",
    glow: "rgba(245, 200, 66, 0.4)",
  },
  glass: {
    border: "rgba(255, 255, 255, 0.08)",
    bg: "rgba(255, 255, 255, 0.04)",
    bgHover: "rgba(255, 255, 255, 0.08)",
  },
} as const;

export const radii = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

export const motion = {
  fast: "150ms",
  normal: "250ms",
  slow: "400ms",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
