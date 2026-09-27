"use client";
import { useState } from "react";
import { CalendarDays, ChevronDown, ClipboardList, Headset, LayoutDashboard, Menu, PhoneForwarded, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

export type Area = "today" | "follow-ups" | "rcc" | "cases" | "schedule";
const navigation = [
  { id: "today", label: "Today", href: "/", icon: LayoutDashboard },
  { id: "follow-ups", label: "Follow-ups", href: "/follow-ups", icon: PhoneForwarded },
  { id: "rcc", label: "RCC Dispatch", href: "/rcc", icon: Headset },
  { id: "cases", label: "Cases", href: "/cases", icon: ClipboardList },
  { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
] as const;

function NavLinks({ currentArea }: { currentArea: Area }) {
  return <nav aria-label="Workspace" className="mt-7 space-y-1">
    {navigation.map(({ id, label, href, icon: Icon }) => <a key={id} href={href} aria-current={currentArea === id ? "page" : undefined} className={"flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors hover:bg-sidebar-accent focus-visible:outline-ring " + (currentArea === id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75")}>
      <Icon aria-hidden="true" className="size-[18px]" /><span>{label}</span>
    </a>)}
  </nav>;
}

export function MendShell({ children, currentArea }: { children: React.ReactNode; currentArea: Area }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-dvh bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[238px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      {/* vinext's production Link navigation currently fails after preventing the native click. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="flex min-h-9 items-center px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mend-logo.svg" width="122" height="35" alt="Mend" className="mend-logo h-auto w-[122px]" style={{ viewTransitionName: currentArea === "today" ? "mend-wordmark" : "none" }} />
      </a>
      <NavLinks currentArea={currentArea} />
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <a href="/settings" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] text-muted-foreground hover:bg-sidebar-accent"><Settings2 className="size-[18px]" aria-hidden="true" />Settings</a>
        <p className="px-3 pt-3 text-xs text-muted-foreground">A clearer desk for every case.</p>
      </div>
    </aside>
    <div className="md:pl-[238px]">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2">
          <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <div className="hidden text-sm text-muted-foreground sm:block">Workspace <span className="mx-2">/</span></div>
          <span className="text-[15px] font-semibold">{navigation.find(item => item.id === currentArea)?.label}</span>
          <ChevronDown className="size-4 text-muted-foreground md:hidden" aria-hidden="true" />
        </div>
        <ThemeToggle />
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
        <NavLinks currentArea={currentArea} />
        <a href="/settings" className="mt-4 flex min-h-11 items-center gap-3 border-t border-sidebar-border px-3 pt-4 text-[15px] text-sidebar-foreground/75"><Settings2 className="size-[18px]" aria-hidden="true" />Settings</a>
      </SheetContent>
    </Sheet>
  </div>;
}
