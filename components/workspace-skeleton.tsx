import { Skeleton } from "@/components/ui/skeleton";

function Line({ width = "w-full", className = "" }: { width?: string; className?: string }) {
  return <Skeleton className={`h-3 ${width} ${className}`} />;
}

function PageHeading({ eyebrow = true, action = false }: { eyebrow?: boolean; action?: boolean }) {
  return <div className="flex flex-wrap items-end justify-between gap-5" aria-hidden="true"><div className="space-y-3">{eyebrow && <Line width="w-24" />}<Skeleton className="h-8 w-48 max-w-full" /><Line width="w-72 max-w-full" /></div>{action && <Skeleton className="h-10 w-36 rounded-lg" />}</div>;
}

/** Focus line rows: time gutter, spine node, name and reason, right-hand label. */
export function WorkRowSkeleton({ count = 4 }: { count?: number }) {
  return <div aria-hidden="true">{Array.from({ length: count }, (_, index) => <div key={index} className="grid min-h-[68px] grid-cols-[68px_22px_minmax(0,1fr)_auto] items-center gap-x-3 pr-3"><Skeleton className="ml-auto h-3 w-12" /><span className="relative grid self-stretch place-items-center before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-px before:bg-border"><Skeleton className="relative size-2.5 rounded-full" /></span><div className="min-w-0 space-y-2 py-2"><Line width="w-36" /><Line width="w-52 max-w-full" /></div><Line width="w-16" className="hidden sm:block" /></div>)}</div>;
}

function ToolbarSkeleton({ tabs = 0 }: { tabs?: number }) {
  return <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3" aria-hidden="true"><Skeleton className="h-10 w-[300px] max-w-full rounded-[10px]" />{tabs > 0 && <Skeleton className="h-10 max-w-full rounded-[12px]" style={{ width: tabs * 84 }} />}<Line width="w-20" className="ml-auto" /></div>;
}

function PanelSkeleton({ className = "" }: { className?: string }) {
  return <aside aria-hidden="true" className={`rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border)] ${className}`}>
    <Skeleton className="h-[22px] w-24 rounded-full" />
    <Skeleton className="mt-4 h-6 w-48 max-w-full" />
    <Line width="w-40" className="mt-3" />
    <Skeleton className="mt-6 h-16 w-full rounded-[12px]" />
    <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Line width="w-14" /><Line width="w-24" /></div>)}</div>
    <div className="mt-6 flex gap-2"><Skeleton className="h-10 flex-1 rounded-lg" /><Skeleton className="h-10 w-24 rounded-lg" /></div>
    <div className="mt-6 space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="grid grid-cols-[80px_1fr] gap-3"><Line width="w-14" /><Line width="w-40 max-w-full" /></div>)}</div>
  </aside>;
}

function QueueSkeleton({ kind }: { kind: "cases" | "follow-ups" }) {
  return <div role="status" aria-label={`Loading ${kind}`}>
    <PageHeading action={kind === "follow-ups"} />
    <div className="mt-8 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
      <section className="min-h-[500px] min-w-0"><ToolbarSkeleton tabs={kind === "cases" ? 5 : 6} /><WorkRowSkeleton count={6} /></section>
      <PanelSkeleton className="hidden min-[1100px]:block" />
    </div>
  </div>;
}

function RccSkeleton() {
  return <div role="status" aria-label="Loading RCC Dispatch">
    <Skeleton className="h-10 w-[420px] max-w-full rounded-[12px]" />
    <div className="mt-8 space-y-3"><Skeleton className="h-8 w-72 max-w-full" /><Line width="w-96 max-w-full" /></div>
    <div className="mt-8 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,.93fr)_minmax(0,1.07fr)]">
      <div className="space-y-8">
        <div className="space-y-3"><Line width="w-36" /><div className="flex flex-wrap gap-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-8 w-28 rounded-full" />)}</div></div>
        <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-3"><Line width="w-24" /><Skeleton className="h-10 w-full rounded-[10px]" /></div>)}</div>
        <div className="space-y-3"><Line width="w-28" /><Skeleton className="h-24 w-full rounded-[10px]" /></div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-[12px]" />
        <div className="min-h-[320px] rounded-xl bg-[var(--document)] p-7 shadow-[0_0_0_1px_rgba(0,0,0,.07)]"><div className="space-y-4"><Line width="w-2/3" /><Line width="w-3/4" /><div className="pt-6"><Line width="w-1/2" /></div>{Array.from({ length: 5 }, (_, index) => <Line key={index} width={index % 2 ? "w-4/5" : "w-full"} />)}</div></div>
        <Skeleton className="h-11 w-44 rounded-lg" />
      </div>
    </div>
  </div>;
}

function ScheduleSkeleton() {
  return <div className="max-w-5xl" role="status" aria-label="Loading schedule">
    <PageHeading action />
    <div className="mt-8 rounded-[14px] bg-sheet p-3 shadow-[0_0_0_1px_var(--border)]" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <div key={index} className={`grid min-h-[64px] grid-cols-[112px_minmax(0,1fr)_132px] items-center gap-x-4 px-3 ${index > 0 ? "border-t border-border" : ""}`}><div className="space-y-2"><Line width="w-20" /><Line width="w-12" /></div><Skeleton className="h-6 w-3/5 rounded-md" /><div className="space-y-2"><Line width="w-28" className="ml-auto" /><Line width="w-20" className="ml-auto" /></div></div>)}</div>
    <div className="mt-6 space-y-4 rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border)]" aria-hidden="true"><Skeleton className="h-10 w-[480px] max-w-full rounded-[12px]" /><div className="flex gap-4"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-32" /></div></div>
  </div>;
}

function SettingsSkeleton() {
  return <div className="max-w-4xl" role="status" aria-label="Loading settings">
    <PageHeading />
    <div className="mt-8 rounded-[14px] bg-sheet px-7 shadow-[0_0_0_1px_var(--border)]" aria-hidden="true">{[0, 1, 2].map(index => <div key={index} className={`grid gap-x-10 gap-y-4 py-7 lg:grid-cols-[240px_minmax(0,1fr)] ${index > 0 ? "border-t border-border" : ""}`}><div className="space-y-3"><Skeleton className="h-4 w-44" /><Line width="w-52 max-w-full" /></div><Skeleton className="h-10 w-44" /></div>)}</div>
  </div>;
}

function FollowUpFormSkeleton() {
  return <div className="mx-auto max-w-[1100px]" role="status" aria-label="Loading new follow-up">
    <Line width="w-28" />
    <div className="mt-8"><PageHeading eyebrow /></div>
    <div className="mt-9 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-8" aria-hidden="true">{[4, 4, 1].map((fields, section) => <div key={section} className="space-y-4 border-t border-border pt-6"><Line width="w-24" /><div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">{Array.from({ length: fields }, (_, index) => <div key={index} className="space-y-3"><Line width="w-28" /><Skeleton className="h-10 w-full rounded-[10px]" /></div>)}</div></div>)}</div>
      <div className="hidden space-y-3 min-[1100px]:block" aria-hidden="true"><Line width="w-24" /><div className="grid min-h-[68px] grid-cols-[68px_22px_minmax(0,1fr)] items-center gap-x-3 rounded-[10px] bg-sheet px-3 shadow-[0_0_0_1px_var(--border)]"><Skeleton className="ml-auto h-3 w-12" /><Skeleton className="mx-auto size-2.5 rounded-full" /><div className="space-y-2 py-2"><Line width="w-32" /><Line width="w-44 max-w-full" /></div></div></div>
    </div>
  </div>;
}

function TodaySkeleton() {
  return <div role="status" aria-label="Loading Today" className="mend-skeleton-wrap">
    <div className="flex flex-wrap items-end justify-between gap-5" aria-hidden="true"><div className="space-y-3"><Line width="w-32" /><Skeleton className="h-8 w-56" /><Line width="w-72 max-w-full" /></div><Skeleton className="h-10 w-36 rounded-lg" /></div>
    <div className="mt-8 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
      <section className="min-w-0"><Skeleton className="mb-5 h-10 w-[420px] max-w-full rounded-[12px]" /><WorkRowSkeleton count={4} /><Skeleton className="mx-3 my-3 h-3 w-24" /><WorkRowSkeleton count={2} /></section>
      <PanelSkeleton className="hidden min-[1100px]:block" />
    </div>
  </div>;
}

export function WorkspaceSkeleton({ area }: { area: "today" | "follow-ups" | "new-follow-up" | "cases" | "rcc" | "schedule" | "settings" }) {
  switch (area) {
    case "today": return <TodaySkeleton />;
    case "follow-ups": return <QueueSkeleton kind="follow-ups" />;
    case "new-follow-up": return <FollowUpFormSkeleton />;
    case "cases": return <QueueSkeleton kind="cases" />;
    case "rcc": return <RccSkeleton />;
    case "schedule": return <ScheduleSkeleton />;
    case "settings": return <SettingsSkeleton />;
  }
}
