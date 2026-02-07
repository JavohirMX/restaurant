"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ThemeToggle({
  className,
  variant = "ghost",
  size = "default",
}: ThemeToggleProps) {
  const { theme, toggleTheme, isHydrated } = useTheme();

  if (!isHydrated) {
    return (
      <div
        className={cn(
          "h-9 w-9 rounded-md animate-pulse bg-muted",
          size === "sm" && "h-8 w-8",
          size === "lg" && "h-10 w-10",
          className
        )}
      />
    );
  }

  const sizeClasses = {
    default: "h-9 w-9",
    sm: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const variantClasses = {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
