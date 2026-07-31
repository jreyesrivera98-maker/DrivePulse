/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad de marca DrivePulse
        "dp-black": "#090d16",      // Sidebar / fondo de marca
        "dp-surface": "#f8fafc",    // Área central de trabajo
        "dp-accent": {
          DEFAULT: "#0d9488", // teal-600 — acento primario "pulse"
          light: "#2dd4bf",   // teal-400 — detalles, líneas de pulso
          dark: "#0f766e",    // teal-700 — hover / estados activos
        },
        status: {
          disponible: "#22c55e",
          en_uso: "#3b82f6",
          reservado: "#eab308",
          mantenimiento: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        pulseLine: {
          "0%": { strokeDashoffset: 340 },
          "100%": { strokeDashoffset: 0 },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease",
        pulseLine: "pulseLine 2.4s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
