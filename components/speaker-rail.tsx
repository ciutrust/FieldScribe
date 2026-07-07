"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Speaker } from "@/db/schema";
import { defaultSpeakerName, speakerBg } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SpeakerRail({
  recordingId,
  speakers,
  orderedLabels,
  onRenamed,
}: {
  recordingId: string;
  speakers: Speaker[];
  orderedLabels: string[];
  onRenamed: () => void;
}) {
  if (speakers.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Speakers
      </h2>
      <ul className="space-y-1">
        {orderedLabels.map((label, i) => (
          <SpeakerRow
            key={label}
            recordingId={recordingId}
            label={label}
            index={i}
            name={speakers.find((s) => s.speakerLabel === label)?.displayName ?? null}
            onRenamed={onRenamed}
          />
        ))}
      </ul>
    </section>
  );
}

function SpeakerRow({
  recordingId,
  label,
  index,
  name,
  onRenamed,
}: {
  recordingId: string;
  label: string;
  index: number;
  name: string | null;
  onRenamed: () => void;
}) {
  const placeholder = defaultSpeakerName(index);
  const [value, setValue] = useState(name ?? "");

  async function save() {
    if ((name ?? "") === value.trim()) return;
    const res = await fetch(`/api/recordings/${recordingId}/speakers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, displayName: value }),
    });
    if (res.ok) onRenamed();
    else toast.error("Could not rename speaker.");
  }

  return (
    <li className="flex items-center gap-2.5">
      <span className={cn("size-2.5 shrink-0 rounded-full", speakerBg(index))} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-full rounded-md bg-transparent px-1.5 py-1 text-sm outline-none transition-colors hover:bg-secondary/60 focus:bg-secondary"
        aria-label={`Rename ${placeholder}`}
      />
    </li>
  );
}
