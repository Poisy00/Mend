"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useContext, type AnchorHTMLAttributes, type MouseEvent } from "react";

/**
 * Lets MendShell see client navigations: `go` runs a navigation inside a transition so the current
 * page stays on screen until the next one is ready, and records where we are heading.
 */
export const NavigationContext = createContext<{ go: (navigate: () => void, destination: string) => void } | null>(null);

type MendLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  prefetch?: boolean;
};

// Originally a Vinext workaround. On Next.js it still gives MendShell a navigation hook (startTransition + NavigationContext),
// so keep it rather than switching to next/link.
export function MendLink({ href, replace = false, prefetch = false, onClick, onMouseEnter, target, download, ...props }: MendLinkProps) {
  const router = useRouter();
  const navigation = useContext(NavigationContext);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || target || download) return;

    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    const to = destination.pathname + destination.search + destination.hash;
    const run = () => { if (replace) router.replace(to); else router.push(to); };
    if (navigation) navigation.go(run, destination.pathname);
    else startTransition(run);
  }

  return <a href={href} target={target} download={download} onClick={navigate} onMouseEnter={event => {
    onMouseEnter?.(event);
    if (prefetch && !event.defaultPrevented) router.prefetch(href);
  }} {...props} />;
}
