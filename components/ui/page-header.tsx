import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("type-eyebrow text-text-secondary", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, description, actions, display = false }: { eyebrow: string; title: string; description?: string; actions?: ReactNode; display?: boolean }) {
  return <div className="flex flex-wrap items-start justify-between gap-5">
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={cn(display ? "type-display mt-2" : "type-title mt-2", "text-balance")}>{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-base text-text-secondary">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
  </div>;
}
