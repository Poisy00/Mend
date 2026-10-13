"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { MendLink, NavigationContext } from "@/components/mend-link";
import { FadeSwap } from "@/components/focus-line/fade";
import { CalendarDays, ChevronsUpDown, FolderClosed, Headset, Inbox, Menu, MessagesSquare, PhoneForwarded } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { SlidingIndicator, useSlidingIndicator } from "@/components/ui/sliding-indicator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AskMend } from "@/components/ai/ask-mend";
import { useQueueCounts } from "@/components/use-queue-counts";
import { shiftSummary, type DayException, type WeekPattern } from "@/lib/schedule/rules";
import { cn } from "@/lib/utils";

export type Area = "today" | "follow-ups" | "rcc" | "cases" | "schedule" | "settings" | "admin";
export type ShellUser = { displayName: string; role: "user" | "admin" };
export type ShellSchedule = { week: WeekPattern; exceptions: DayException[]; now: number };
const navigation = [
  { id: "today", label: "Today", href: "/", icon: Inbox },
  { id: "follow-ups", label: "Follow-ups", href: "/follow-ups", icon: PhoneForwarded },
  { id: "rcc", label: "RCC Dispatch", href: "/rcc", icon: Headset },
  { id: "cases", label: "Cases", href: "/cases", icon: FolderClosed },
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

const itemClass = "relative flex h-11 w-full items-center gap-2.5 rounded-[8px] px-2.5 t-label text-text-secondary outline-none transition-[background-color,color,box-shadow,transform] duration-[var(--dur-quick)] ease-[var(--ease-out)] active:scale-[0.96] motion-move before:absolute before:inset-x-0 before:-inset-y-[2px] hover-fine:bg-black/[.04] hover-fine:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:h-9 dark:hover-fine:bg-white/[.05]";
const activeClass = "text-foreground hover-fine:bg-transparent dark:hover-fine:bg-transparent";
const indicatorVars = "[--ind-bg:var(--sheet)] [--ind-shadow:var(--chip-shadow)]";

function useNow(initial: number, intervalMs = 60_000) {
  const [now, setNow] = useState(initial);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), intervalMs); return () => window.clearInterval(timer); }, [intervalMs]);
  return now;
}

function NavLinks({ currentArea, onNavigate }: { currentArea: Area; onNavigate?: () => void }) {
  const counts = useQueueCounts();
  const needCall = counts.overdue + counts.now;
  const list = useRef<HTMLElement>(null);
  useSlidingIndicator(list, navigation.some(item => item.id === currentArea) ? currentArea : null);
  return <nav ref={list} aria-label="Workspace" className="relative flex flex-col gap-px">
    <SlidingIndicator className="rounded-[8px] bg-sheet shadow-chip" />
    {navigation.map(({ id, label, href, icon: Icon }) => {
      const active = currentArea === id;
      const count = id === "follow-ups" ? needCall : 0;
      return <MendLink key={id} href={href} prefetch onClick={onNavigate} data-indicator-key={id} data-indicator-active={active || undefined} aria-current={active ? "page" : undefined} className={cn(itemClass, indicatorVars, active && activeClass)}>
        <Icon aria-hidden="true" strokeWidth={1.75} className={cn("size-4 shrink-0", active ? "text-primary" : "text-text-secondary")} />
        <span>{label}</span>
        {count > 0 && <>
          <span className="sr-only">, {count} need a call</span>
          <span aria-hidden="true" className={cn("t-id ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 !text-[11px]", counts.overdue > 0 ? "bg-status-overdue-tint text-status-overdue" : "bg-status-due-tint text-status-due")}>{count}</span>
        </>}
      </MendLink>;
    })}
  </nav>;
}

function AskMendItem({ onOpen }: { onOpen: () => void }) {
  return <button type="button" onClick={onOpen} aria-keyshortcuts="Control+J Meta+J" className={cn(itemClass, "text-left")}>
    <MessagesSquare aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
    <span>Ask Mend</span>
    <span className="ml-auto hidden md:block"><Kbd keys={["mod", "J"]} /></span>
  </button>;
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function AgentCard({ user, schedule, onNavigate }: { user: ShellUser; schedule: ShellSchedule; onNavigate?: () => void }) {
  const now = useNow(schedule.now);
  const { theme, setTheme } = useTheme();
  const summary = shiftSummary(schedule.week, schedule.exceptions, new Date(now));
  const dot = summary.state === "on" ? "bg-status-done" : summary.state === "break" ? "bg-status-due" : "bg-text-muted";
  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }); window.location.replace("/login"); }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-black/[.04] focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-black/[.04] dark:hover-fine:bg-white/[.05] dark:data-[state=open]:bg-white/[.05]">
        <span aria-hidden="true" className="t-id grid size-7 shrink-0 place-items-center rounded-full bg-sheet !text-[11px] text-text-secondary shadow-chip">{initialsOf(user.displayName)}</span>
        <span className="min-w-0 flex-1">
          <span className="t-label block truncate">{user.displayName}</span>
          <span className="t-caption flex items-center gap-1.5 text-text-secondary"><span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} /><span className="truncate">{summary.line}</span></span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-text-muted" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-52">
      <DropdownMenuItem asChild><MendLink href="/settings" onClick={onNavigate}>Settings</MendLink></DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Appearance</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {user.role === "admin" && <DropdownMenuItem asChild><MendLink href="/admin" onClick={onNavigate}>Agent access</MendLink></DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function SidebarContent({ currentArea, user, schedule, onAsk, onNavigate }: { currentArea: Area; user: ShellUser; schedule: ShellSchedule; onAsk: () => void; onNavigate?: () => void }) {
  return <>
    <NavLinks currentArea={currentArea} onNavigate={onNavigate} />
    <div className="mt-4"><AskMendItem onOpen={() => { onNavigate?.(); onAsk(); }} /></div>
    <div className="mt-auto pt-4"><AgentCard user={user} schedule={schedule} onNavigate={onNavigate} /></div>
  </>;
}

/** `flight` names the logo for the sign-in view transition (see globals.css). Only one logo on screen may carry it. */
function Logo({ width, alt = "", flight }: { width: number; alt?: string; flight?: "desktop" | "mobile" }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/mend-logo.svg" width={width} height={Math.round(width * 35 / 122)} alt={alt} className={cn("mend-logo h-auto", flight === "desktop" && "mend-flight-desktop", flight === "mobile" && "mend-flight-mobile")} style={{ width }} />;
}

export function MendShell({ children, user, schedule }: { children: React.ReactNode; user: ShellUser; schedule: ShellSchedule }) {
  const pathname = usePathname();
  const [isPending, startNavigation] = useTransition();
  const [heading, setHeading] = useState<{ from: string; to: string } | null>(null);
  // Navigating means we left `from` for another path that has not arrived yet. The transition stays pending until it does.
  const navigating = isPending && heading !== null && heading.from === pathname && heading.to !== pathname;
  const go = useCallback((navigate: () => void, to: string) => {
    setHeading({ from: window.location.pathname, to });
    startNavigation(navigate);
  }, []);
  const navigation = useMemo(() => ({ go }), [go]);
  // The sidebar follows the destination at once instead of waiting for the page.
  const currentArea = areaFromPathname(navigating ? heading.to : pathname);
  const [open, setOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setAskOpen(value => !value); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const openAsk = () => setAskOpen(true);

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
  return <NavigationContext.Provider value={navigation}><TooltipProvider delayDuration={400} skipDelayDuration={300}>
    <div className="min-h-dvh bg-desk text-foreground">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-sheet px-3 py-2 t-label shadow-chip focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[232px] flex-col px-3 py-3 md:flex">
        <MendLink href="/" className="mb-5 flex h-10 items-center rounded-[8px] px-2.5 outline-none focus-visible:outline-2 focus-visible:outline-ring"><Logo width={88} alt="Mend" flight="desktop" /></MendLink>
        <SidebarContent currentArea={currentArea} user={user} schedule={schedule} onAsk={openAsk} />
      </aside>
      <div ref={sentinel} aria-hidden="true" className="absolute top-0 h-px w-px md:hidden" />
      <header className={cn("sticky top-0 z-10 grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-desk px-2 transition-shadow duration-[var(--dur-quick)] md:hidden", scrolled && "shadow-[0_1px_0_var(--border)]")}>
        <div><Button variant="ghost" size="icon-lg" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></Button></div>
        <MendLink href="/" aria-label="Mend home"><Logo width={72} flight="mobile" /></MendLink>
        <div className="flex justify-end"><Button variant="ghost" size="icon-lg" onClick={openAsk} aria-label="Ask Mend" aria-keyshortcuts="Control+J Meta+J"><MessagesSquare /></Button></div>
      </header>
      <div className="md:py-2 md:pr-2 md:pl-[240px]">
        <div className="relative min-h-[calc(100dvh-56px)] overflow-clip bg-sheet md:min-h-[calc(100dvh-16px)] md:rounded-[var(--radius-sheet)] md:shadow-sheet">
          <div aria-hidden="true" data-pending={navigating || undefined} className="mend-progress" />
          <main id="main-content" data-pending={navigating || undefined} aria-busy={navigating || undefined} className="mend-main mx-auto w-full max-w-[1240px] px-4 pt-6 pb-16 md:px-10 md:pt-10 xl:px-12"><FadeSwap swapKey={pathname} speed="page">{children}</FadeSwap></main>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[280px] bg-desk p-3">
          <SheetHeader className="p-0">
            <SheetTitle className="flex h-10 items-center px-2.5"><span className="sr-only">Mend</span><Logo width={88} /></SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col"><SidebarContent currentArea={currentArea} user={user} schedule={schedule} onAsk={openAsk} onNavigate={() => setOpen(false)} /></div>
        </SheetContent>
      </Sheet>
      <AskMend open={askOpen} onOpenChange={setAskOpen} />
    </div>
  </TooltipProvider></NavigationContext.Provider>;
}
