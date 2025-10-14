"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BsMoonStarsFill, BsSunFill } from "react-icons/bs";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="text-xl p-2 rounded-lg bg-gray-700/40 hover:bg-gray-600 transition"
    >
      {theme === "light" ? (
        <BsMoonStarsFill className="text-yellow-300" />
      ) : (
        <BsSunFill className="text-yellow-400" />
      )}
    </button>
  );
}
