import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("t-eyebrow text-text-secondary", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: ReactNode; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-5">
    <div className="min-w-0">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="t-title mt-2">{title}</h1>
      {description && <p className="t-body-lg mt-2 max-w-[60ch] text-text-secondary">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>;
}
