"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  return <Button type="button" variant="ghost" size="icon" aria-label={ready && resolvedTheme === "dark" ? "Use light appearance" : "Use dark appearance"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
    {ready && resolvedTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
  </Button>;
}
