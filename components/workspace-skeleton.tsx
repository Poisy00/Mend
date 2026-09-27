import { Skeleton } from "@/components/ui/skeleton";

function Line({ width = "w-full", className = "" }: { width?: string; className?: string }) {
  return <Skeleton className={`h-3 ${width} ${className}`} />;
}

function PageHeading({ eyebrow = true, action = false }: { eyebrow?: boolean; action?: boolean }) {
  return <div className="flex items-end justify-between gap-5" aria-hidden="true"><div className="space-y-4">{eyebrow && <Line width="w-24" />}<Skeleton className="h-10 w-48 max-w-full" /><Line width="w-72 max-w-full" /></div>{action && <Skeleton className="h-10 w-36 rounded-lg" />}</div>;
}

export function WorkRowSkeleton({ count = 4 }: { count?: number }) {
  return <div aria-hidden="true">{Array.from({ length: count }, (_, index) => <div key={index} className="flex min-h-[78px] items-center gap-3 border-b border-border/70 px-3 py-4"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Line width="w-36" /><Line width="w-52 max-w-full" /></div><div className="hidden space-y-2 sm:block"><Line width="w-20" /><Line width="w-24" /></div></div>)}</div>;
}

function QueueSkeleton({ kind }: { kind: "cases" | "follow-ups" }) {
  return <div role="status" aria-label={`Loading ${kind}`}><PageHeading action={kind === "follow-ups"} />{kind === "cases" && <div className="mt-8 flex gap-3 border-b border-border pb-5">{["w-12", "w-16", "w-20", "w-20"].map((width, index) => <Skeleton key={index} className={`h-8 ${width} rounded-lg`} />)}</div>}<div className="mt-5 grid gap-0 border-t border-border min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]"><section className="min-h-[500px] min-[1100px]:border-r min-[1100px]:pr-7"><div className="flex h-[72px] items-center border-b border-border"><Skeleton className="h-9 w-64 max-w-full" /></div><WorkRowSkeleton count={5} /></section><aside className="hidden min-[1100px]:block min-[1100px]:pl-7"><div className="space-y-4 py-8"><Line width="w-20" /><Skeleton className="h-7 w-48" /><Line width="w-40" /><div className="pt-6"><Line width="w-full" /></div><Line width="w-4/5" /></div></aside></div></div>;
}

function RccSkeleton() {
  return <div role="status" aria-label="Loading RCC Dispatch"><div className="flex gap-7"><Line width="w-40" /><Line width="w-32" /><Line width="w-32" /></div><div className="mt-9"><Skeleton className="h-9 w-80 max-w-full" /><Line width="w-96 max-w-full" className="mt-3" /></div><div className="mt-10 grid gap-10 min-[1100px]:grid-cols-[minmax(0,.93fr)_minmax(0,1.07fr)]"><div><Line width="w-32" /><div className="mt-7 grid gap-x-7 gap-y-7 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-3"><Line width="w-24" /><Skeleton className="h-9 w-full rounded-none border-b border-border bg-transparent" /></div>)}</div><div className="mt-8 space-y-3"><Line width="w-32" /><Skeleton className="h-20 w-full rounded-none border-b border-border bg-transparent" /></div><div className="mt-8 space-y-3"><Line width="w-28" /><Skeleton className="h-9 w-full rounded-none border-b border-border bg-transparent" /></div></div><div><Line width="w-28" /><div className="mt-6 min-h-[350px] rounded-xl bg-[var(--document)] p-7 shadow-[0_0_0_1px_rgba(0,0,0,.07)]"><div className="space-y-4"><Line width="w-2/3" /><Line width="w-3/4" /><div className="pt-7"><Line width="w-1/2" /></div>{Array.from({ length: 5 }, (_, index) => <Line key={index} width={index % 2 ? "w-4/5" : "w-full"} />)}</div></div><Skeleton className="mt-7 h-11 w-40 rounded-lg" /></div></div></div>;
}

function ScheduleSkeleton() {
  return <div className="max-w-5xl" role="status" aria-label="Loading schedule"><PageHeading /><div className="mt-9 border-t border-border">{Array.from({ length: 7 }, (_, index) => <div key={index} className="grid min-h-[90px] items-center gap-3 border-b border-border sm:grid-cols-[140px_110px_1fr_1fr]"><Line width="w-24" /><Skeleton className="h-5 w-16" /><Skeleton className="h-9 w-full rounded-lg" /><Skeleton className="h-9 w-full rounded-lg" /></div>)}</div><div className="mt-10 space-y-4"><Line width="w-40" /><Skeleton className="h-9 w-64" /></div></div>;
}

function SettingsSkeleton() {
  return <div className="max-w-3xl" role="status" aria-label="Loading settings"><PageHeading /><div className="mt-10 space-y-5 border-t border-border pt-7"><Skeleton className="h-6 w-52" /><Line width="w-72" /><Skeleton className="h-10 w-44" /></div><div className="mt-10 space-y-5 border-t border-border pt-7"><Skeleton className="h-6 w-64" /><Line width="w-96 max-w-full" /><Skeleton className="h-10 w-48" /></div></div>;
}

function FollowUpFormSkeleton() {
  return <div className="mx-auto max-w-[800px]" role="status" aria-label="Loading new follow-up"><Line width="w-28" /><div className="mt-8"><PageHeading eyebrow /></div><div className="mt-9 grid gap-5 border-t border-border pt-7 sm:grid-cols-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><Line width="w-28" /><Skeleton className="h-10 w-full rounded-lg" /></div>)}</div><div className="mt-8 space-y-3 border-t border-border pt-7"><Line width="w-40" /><Skeleton className="h-28 w-full rounded-lg" /></div></div>;
}

function TodaySkeleton() {
  return <div role="status" aria-label="Loading Today"><PageHeading action /><div className="mt-8 grid border-y border-border lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]"><section className="min-h-[410px] py-8 lg:border-r lg:pr-9"><Line width="w-28" /><Skeleton className="mt-3 h-7 w-40" /><div className="mt-7"><WorkRowSkeleton count={4} /></div></section><aside className="py-8 lg:pl-9"><Line width="w-24" /><Skeleton className="mt-3 h-7 w-48" /><Skeleton className="mt-7 h-[104px] w-full rounded-xl" /><Skeleton className="mt-3 h-[104px] w-full rounded-xl" /></aside></div></div>;
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
