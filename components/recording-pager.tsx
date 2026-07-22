"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "inline-flex size-8 items-center justify-center rounded-lg border transition-colors";
const ON = "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground";
const OFF = "text-muted-foreground/25";

/** Prev/next navigation between recordings. Arrow keys work too, unless you're
 * typing in a field or scrubbing the audio slider. */
export function RecordingPager({
  prevId,
  nextId,
}: {
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft" && prevId) {
        e.preventDefault();
        router.push(`/r/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId) {
        e.preventDefault();
        router.push(`/r/${nextId}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, router]);

  return (
    <div className="flex items-center gap-1">
      {prevId ? (
        <Link
          href={`/r/${prevId}`}
          className={cn(BASE, ON)}
          aria-label="Previous recording"
          title="Previous recording (←)"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(BASE, OFF)} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {nextId ? (
        <Link
          href={`/r/${nextId}`}
          className={cn(BASE, ON)}
          aria-label="Next recording"
          title="Next recording (→)"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(BASE, OFF)} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
