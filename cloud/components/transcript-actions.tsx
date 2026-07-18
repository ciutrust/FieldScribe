"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium " +
  "text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground " +
  "disabled:opacity-60";

/** Copy the whole transcript to the clipboard, or download it as a .md file.
 * The markdown is built server-side and passed in, so both actions hand off
 * exactly what's on the page. */
export function TranscriptActions({
  markdown,
  filename,
  className,
}: {
  markdown: string;
  filename: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = markdown;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button onClick={copy} className={BTN} aria-label="Copy transcript to clipboard">
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={download} className={BTN} aria-label="Download transcript as Markdown">
        <Download className="size-3.5" />
        .md
      </button>
    </div>
  );
}
