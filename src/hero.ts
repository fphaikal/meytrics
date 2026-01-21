// hero.ts
import { heroui } from "@heroui/react";
// or import from theme package if you are using individual packages.
// import { heroui } from "@heroui/theme";
export default heroui({
  themes: {
    light: {
      colors: {
        background: "#f5f6fa",
        foreground: "#2e374c",
        content1: "#ffffff",
        content2: "#eaedf4",
        content3: "#d1d8e6",
        content4: "#a9b6d0",
        primary: {
          50: "#f0fdf4",
          100: "#ddfbe7",
          200: "#bdf5cf",
          300: "#89ecab",
          400: "#3bd671",
          500: "#26c15c",
          600: "#1a9f49",
          700: "#187d3c",
          800: "#186334",
          900: "#16512c",
          DEFAULT: "#3bd671",
          foreground: "#ffffff",
        },
      },
    },
    dark: {
      colors: {
        background: "#222838",
        foreground: "#eaedf4",
        content1: "#222838", //Card,Modal Color
        content2: "#131a25",
        content3: "#3a496a",
        content4: "#465a83",
        default: {
          50: "#18181b",
          100: "#131a25",//Input Color
          200: "#3f3f46",
          300: "#52525b",
          400: "#71717a",
          500: "#a1a1aa",
          600: "#d4d4d8",
          700: "#e4e4e7",
          800: "#f4f4f5",
          900: "#fafafa",
          DEFAULT: "#3f3f46",
          foreground: "#fafafa",
        },
        primary: {
          50: "#f0fdf4",
          100: "#ddfbe7",
          200: "#bdf5cf",
          300: "#89ecab",
          400: "#3bd671",
          500: "#26c15c",
          600: "#1a9f49",
          700: "#187d3c",
          800: "#186334",
          900: "#16512c",
          DEFAULT: "#3bd671",
          foreground: "#ffffff",
        },
      },
    },
  },
});

