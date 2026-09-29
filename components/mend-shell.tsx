"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MendLink } from "@/components/mend-link";
import { CalendarDays, ChevronDown, ClipboardList, Headset, LayoutDashboard, Menu, PhoneForwarded, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { AskMend } from "@/components/ai/ask-mend";

export type Area = "today" | "follow-ups" | "rcc" | "cases" | "schedule" | "settings" | "admin";
const navigation = [
  { id: "today", label: "Today", href: "/", icon: LayoutDashboard },
  { id: "follow-ups", label: "Follow-ups", href: "/follow-ups", icon: PhoneForwarded },
  { id: "rcc", label: "RCC Dispatch", href: "/rcc", icon: Headset },
  { id: "cases", label: "Cases", href: "/cases", icon: ClipboardList },
  { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
] as const;

function areaFromPathname(pathname: string): Area {
  if (pathname === "/follow-ups" || pathname.startsWith("/follow-ups/")) return "follow-ups";
  if (pathname === "/rcc" || pathname.startsWith("/rcc/")) return "rcc";
  if (pathname === "/cases" || pathname.startsWith("/cases/")) return "cases";
  if (pathname === "/schedule" || pathname.startsWith("/schedule/")) return "schedule";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return "today";
}

function NavLinks({ currentArea, onNavigate }: { currentArea: Area; onNavigate?: () => void }) {
  return <nav aria-label="Workspace" className="mt-7 space-y-1">
    {navigation.map(({ id, label, href, icon: Icon }) => <MendLink key={id} href={href} prefetch onClick={onNavigate} aria-current={currentArea === id ? "page" : undefined} className={"flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors hover:bg-sidebar-accent focus-visible:outline-ring " + (currentArea === id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75")}>
      <Icon aria-hidden="true" className="size-[18px]" /><span>{label}</span>
    </MendLink>)}
  </nav>;
}

export function MendShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentArea = areaFromPathname(pathname);
  const [open, setOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;
    let expiryCheck: ReturnType<typeof setTimeout> | undefined;
    const originalFetch = window.fetch.bind(window);
    const leaveDesk = () => {
      if (!active) return;
      setSessionExpired(true);
      window.location.replace("/login");
    };
    const checkSession = async () => {
      try {
        const response = await originalFetch("/api/auth/me", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) return leaveDesk();
        if (!response.ok) return;
        const { expiresAt, idleExpiresAt } = await response.json() as { expiresAt: string; idleExpiresAt: string };
        clearTimeout(expiryCheck);
        const deadline = Math.min(Date.parse(expiresAt), Date.parse(idleExpiresAt));
        if (Number.isFinite(deadline)) {
          expiryCheck = setTimeout(checkSession, Math.max(1000, deadline - Date.now() + 250));
        }
      } catch {
        // Temporary network failures should not discard a valid session.
      }
    };
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (response.status === 401 && url.origin === window.location.origin && url.pathname.startsWith("/api/")) leaveDesk();
      return response;
    };
    const checkOnReturn = () => { if (document.visibilityState === "visible") void checkSession(); };
    document.addEventListener("visibilitychange", checkOnReturn);
    window.addEventListener("focus", checkOnReturn);
    window.addEventListener("pageshow", checkOnReturn);
    const interval = setInterval(checkSession, 30_000);
    void checkSession();
    return () => {
      active = false;
      clearTimeout(expiryCheck);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkOnReturn);
      window.removeEventListener("focus", checkOnReturn);
      window.removeEventListener("pageshow", checkOnReturn);
      window.fetch = originalFetch;
    };
  }, []);

  if (sessionExpired) return null;
  return <div className="min-h-dvh bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[238px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <MendLink href="/" className="flex min-h-9 items-center px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mend-logo.svg" width="122" height="35" alt="Mend" className="mend-logo h-auto w-[122px]" />
      </MendLink>
      <NavLinks currentArea={currentArea} />
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <MendLink href="/settings" aria-current={currentArea === "settings" ? "page" : undefined} className={"flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-sidebar-accent " + (currentArea === "settings" ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground")}><Settings2 className="size-[18px]" aria-hidden="true" />Settings</MendLink>
        <p className="px-3 pt-3 text-xs text-muted-foreground">A clearer desk for every case.</p>
      </div>
    </aside>
    <div className="md:pl-[238px]">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2">
          <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <div className="hidden text-sm text-muted-foreground sm:block">Workspace <span className="mx-2">/</span></div>
          <span className="text-[15px] font-semibold">{currentArea === "settings" ? "Settings" : currentArea === "admin" ? "Agent access" : navigation.find(item => item.id === currentArea)?.label}</span>
          <ChevronDown className="size-4 text-muted-foreground md:hidden" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2"><AskMend /><ThemeToggle /></div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] bg-sidebar p-5">
        <SheetHeader>
          <SheetTitle className="text-left text-2xl tracking-tight">
            <span className="sr-only">Mend</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mend-logo.svg" width="122" height="35" alt="" className="mend-logo h-auto w-[122px]" />
          </SheetTitle>
          <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
        </SheetHeader>
        <NavLinks currentArea={currentArea} onNavigate={() => setOpen(false)} />
        <MendLink href="/settings" onClick={() => setOpen(false)} aria-current={currentArea === "settings" ? "page" : undefined} className={"mt-4 flex min-h-11 items-center gap-3 border-t border-sidebar-border px-3 pt-4 text-[15px] " + (currentArea === "settings" ? "font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/75")}><Settings2 className="size-[18px]" aria-hidden="true" />Settings</MendLink>
      </SheetContent>
    </Sheet>
  </div>;
}
