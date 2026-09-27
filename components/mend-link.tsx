"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

type MendLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  prefetch?: boolean;
};

// Vinext compatibility: native next/link navigation and prefetch fail in the
// deployed production build. Keep this wrapper until a Vinext upgrade is verified.
export function MendLink({ href, replace = false, prefetch = false, onClick, onMouseEnter, target, download, ...props }: MendLinkProps) {
  const router = useRouter();

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || target || download) return;

    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    if (replace) router.replace(destination.pathname + destination.search + destination.hash);
    else router.push(destination.pathname + destination.search + destination.hash);
  }

  return <a href={href} target={target} download={download} onClick={navigate} onMouseEnter={event => {
    onMouseEnter?.(event);
    if (prefetch && !event.defaultPrevented) router.prefetch(href);
  }} {...props} />;
}
