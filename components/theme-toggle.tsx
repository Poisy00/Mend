"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <Button type="button" variant="ghost" size="icon" aria-label={ready && resolvedTheme === "dark" ? "Use light appearance" : "Use dark appearance"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
    {ready && resolvedTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
  </Button>;
}
