/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Purple/Pink Gradient - primary brand color (elegant, modern, healthcare)
        primary: {
          50: "#faf5f9",
          100: "#f5ebf3",
          200: "#edd6e8",
          300: "#E8B4D4", // Light pink
          400: "#d89cc7",
          500: "#B88CD6", // Medium purple
          600: "#A78BCA", // Medium purple alt
          700: "#7B68BB", // Dark purple/blue
          800: "#6B5B95", // Dark purple alt
          900: "#564a7a",
          950: "#3a3254",
        },
        // Pink accent color (warm, approachable)
        accent: {
          50: "#fef5f8",
          100: "#fce8f0",
          200: "#fbd4e4",
          300: "#f8b3cd",
          400: "#f488af",
          500: "#ed5f92",
          600: "#E8B4D4", // Light pink accent
          700: "#c2256b",
          800: "#a1205c",
          900: "#862050",
          950: "#520d2e",
        },
        // Clean white surfaces for backgrounds
        surface: {
          50: "#ffffff",
          100: "#fafafa",
          200: "#f5f5f5",
          300: "#efefef",
          400: "#e5e5e5",
          500: "#d4d4d4",
        },
        // Sage green for success states
        sage: {
          50: "#f6f7f4",
          100: "#e3e7dc",
          200: "#c9d2bb",
          300: "#a7b694",
          400: "#87996f",
          500: "#6b7d53",
          600: "#546340",
          700: "#424d33",
          800: "#373f2c",
          900: "#303628",
        },
        // Black/dark gray for text (clean, professional)
        ink: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#1A1A1A", // Near black
          950: "#000000", // Pure black
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "soft": "0 2px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.03)",
        "soft-lg": "0 10px 40px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
        "soft-xl": "0 20px 50px -12px rgba(0, 0, 0, 0.08)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)",
        "glow": "0 0 20px rgba(184, 140, 214, 0.25)", // Purple glow
        "glow-accent": "0 0 20px rgba(232, 180, 212, 0.25)", // Pink glow
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E8B4D4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
