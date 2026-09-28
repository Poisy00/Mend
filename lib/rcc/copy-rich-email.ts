import type { EmailDraft } from "./types";

/** Copy a rendered email for Outlook, retaining a plain-text clipboard flavor. */
export async function copyRichEmail(draft: EmailDraft): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([draft.html], { type: "text/html" }),
        "text/plain": new Blob([draft.plain], { type: "text/plain" }),
      })]);
      return;
    } catch {
      // Some browsers allow selection copying even when the async API is blocked.
    }
  }

  const fragment = draft.html.split("<!--StartFragment-->")[1]?.split("<!--EndFragment-->")[0];
  if (!fragment) throw new Error("Formatted email is unavailable");
  const container = document.createElement("div");
  container.innerHTML = fragment;
  container.style.cssText = "position:fixed;left:-99999px;top:0";
  document.body.appendChild(container);
  const selection = window.getSelection();
  const previous = selection && [...Array(selection.rangeCount)].map((_, index) => selection.getRangeAt(index).cloneRange());
  try {
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (!document.execCommand("copy")) throw new Error("Browser blocked formatted copying");
  } finally {
    selection?.removeAllRanges();
    previous?.forEach(range => selection?.addRange(range));
    container.remove();
  }
}
