import type { ReactNode } from "react";

/** Two-column settings row: what it is on the left, the controls on the right. */
export function SettingsSection({ title, description, id, children }: { title: string; description?: string; id?: string; children: ReactNode }) {
  return <section aria-labelledby={id ?? undefined} className="grid gap-x-10 gap-y-4 border-t border-border py-7 first-of-type:mt-8 lg:grid-cols-[220px_minmax(0,1fr)]">
    <div><h2 id={id} className="t-label">{title}</h2>{description && <p className="t-meta mt-1 text-text-secondary">{description}</p>}</div>
    <div className="min-w-0">{children}</div>
  </section>;
}
