/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f7f8fa",
          dark: "#14161a",
          "dark-subtle": "#1c1f24",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      // A small, calm motion system: one curve for things settling into place
      // (slow start, gentle stop) and one for things leaving (quick, unobtrusive).
      // Everything below is built from these two so the whole app moves consistently.
      transitionTimingFunction: {
        "calm-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "calm-in": "cubic-bezier(0.7, 0, 0.84, 0)",
      },
      transitionDuration: {
        320: "320ms",
        280: "280ms",
      },
      keyframes: {
        // Bottom sheet (mobile): rises gently from just below its resting position.
        "sheet-in-mobile": {
          "0%": { transform: "translateY(28px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "sheet-out-mobile": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(20px)", opacity: "0" },
        },
        // Centered dialog (desktop): stays perfectly centered while it scales,
        // so the translate(-50%,-50%) centering and the scale share one keyframe.
        "sheet-in-desktop": {
          "0%": { transform: "translate(-50%, -50%) scale(0.96)", opacity: "0" },
          "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: "1" },
        },
        "sheet-out-desktop": {
          "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: "1" },
          "100%": { transform: "translate(-50%, -50%) scale(0.97)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "toast-in": {
          "0%": { transform: "translateY(16px) scale(0.98)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "toast-out": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(6px) scale(0.98)", opacity: "0" },
        },
        // Small contextual menus (dropdowns) — quick, subtle, no travel distance.
        "popover-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "popover-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.98)", opacity: "0" },
        },
        // Plays once on mount only (a CSS `animation`, not a `transition`), so it
        // never replays on ordinary re-renders — just when a section first appears.
        "card-in": {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "sheet-in-mobile": "sheet-in-mobile 0.36s cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-out-mobile": "sheet-out-mobile 0.22s cubic-bezier(0.7, 0, 0.84, 0) both",
        "sheet-in-desktop": "sheet-in-desktop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-out-desktop": "sheet-out-desktop 0.2s cubic-bezier(0.7, 0, 0.84, 0) both",
        "fade-in": "fade-in 0.22s ease-out both",
        "fade-out": "fade-out 0.18s ease-in both",
        "toast-in": "toast-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-out": "toast-out 0.22s cubic-bezier(0.7, 0, 0.84, 0) both",
        "popover-in": "popover-in 0.16s cubic-bezier(0.16, 1, 0.3, 1) both",
        "popover-out": "popover-out 0.12s cubic-bezier(0.7, 0, 0.84, 0) both",
        "card-in": "card-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
