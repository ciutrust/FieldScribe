"use client";

import { useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadZone({ onUploaded, hero }: { onUploaded: () => void; hero: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skipSummary, setSkipSummary] = useState(false);
  const [enhanceAudio, setEnhanceAudio] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    for (const file of list) {
      const body = new FormData();
      body.append("file", file);
      if (skipSummary) body.append("skipSummary", "1");
      if (enhanceAudio) body.append("enhanceAudio", "1");
      try {
        const res = await fetch("/api/upload", { method: "POST", body });
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
        toast.success(`Queued ${file.name}`);
      } catch (e) {
        toast.error(`Could not queue ${file.name}: ${e instanceof Error ? e.message : e}`);
      }
      onUploaded();
    }
    setUploading(false);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        upload(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-xl border border-dashed transition-colors",
        dragOver ? "border-flare bg-flare-deep/20" : "border-input",
        hero ? "px-6 py-14" : "px-5 py-6"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <div className={cn("flex items-center gap-5", hero && "flex-col text-center")}>
        <AudioLines className={cn("text-flare shrink-0", hero ? "size-10" : "size-6")} />
        <div className={cn("flex-1 space-y-1", hero && "space-y-2")}>
          {hero ? (
            <h1 className="text-2xl font-semibold tracking-tight">Drop in a recording</h1>
          ) : (
            <p className="text-sm font-medium">Drop files here</p>
          )}
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Meetings, memos, calls — FieldScribe writes down who said what, without the audio
            leaving this Mac.
          </p>
        </div>
        <div className={cn("flex items-center gap-4", hero && "flex-col gap-3")}>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Choose files"}
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipSummary}
              onChange={(e) => setSkipSummary(e.target.checked)}
              className="accent-[var(--flare)]"
            />
            Skip AI summary
          </label>
          <label
            className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none"
            title="Lift quiet, far-from-mic speech (e.g. doorbell/security clips)"
          >
            <input
              type="checkbox"
              checked={enhanceAudio}
              onChange={(e) => setEnhanceAudio(e.target.checked)}
              className="accent-[var(--flare)]"
            />
            Boost distant audio
          </label>
        </div>
      </div>
    </div>
  );
}
