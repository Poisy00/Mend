import type { ReactNode } from "react";

/** Two-column settings row on the sheet: what it is on the left (240px), the controls on the right. */
export function SettingsSection({ title, description, id, children }: { title: string; description?: string; id?: string; children: ReactNode }) {
  return <section aria-labelledby={id ?? undefined} className="grid gap-x-10 gap-y-4 border-t border-border py-7 first:border-t-0 lg:grid-cols-[240px_minmax(0,1fr)]">
    <div><h2 id={id} className="t-label !font-semibold">{title}</h2>{description && <p className="t-meta mt-1 max-w-[34ch] text-text-secondary">{description}</p>}</div>
    <div className="min-w-0">{children}</div>
  </section>;
}
