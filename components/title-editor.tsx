"use client";

import { useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

/** Inline-editable recording title. Enter or click-away saves; Escape or the
 * ✕ discards. Saving bumps updated_at so the change syncs to the cloud. */
export function TitleEditor({
  recordingId,
  title,
  onSaved,
}: {
  recordingId: string;
  title: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const cancelling = useRef(false);

  function start() {
    setValue(title);
    setEditing(true);
  }

  function cancel() {
    cancelling.current = true;
    setEditing(false);
    setValue(title);
  }

  async function save() {
    if (cancelling.current) {
      cancelling.current = false;
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setEditing(false);
      setValue(title);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      onSaved();
    } catch {
      toast.error("Couldn't rename — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") cancel();
          }}
          className="w-full min-w-0 rounded-md border bg-card px-2 py-0.5 text-xl font-semibold tracking-tight outline-none transition-colors focus:border-flare/50"
          aria-label="Recording title"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            cancel();
          }}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Cancel rename"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="group flex max-w-full items-center gap-2 text-left"
      title="Rename"
      aria-label="Rename recording"
    >
      <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
      <Pencil className="size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
