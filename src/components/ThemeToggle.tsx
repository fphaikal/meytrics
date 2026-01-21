import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-default-600 hover:bg-default-100 rounded-lg transition-colors"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}
