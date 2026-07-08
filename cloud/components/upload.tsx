"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024; // Supabase free-plan per-object cap

export function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB — the cloud inbox tops out ` +
          `at 50 MB (about 90 min of voice memo). Bigger files: drop them into the app on the Mac.`
      );
      return;
    }
    setBusy(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const id = crypto.randomUUID();
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const objectPath = `${user.id}/${id}.${ext}`;
      const title = file.name.replace(/\.[^.]+$/, "");

      const { error: uploadError } = await supabase.storage
        .from("fs-inbox")
        .upload(objectPath, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) throw new Error(uploadError.message);

      const { error: queueError } = await supabase.from("fs_upload_queue").insert({
        id,
        object_path: objectPath,
        original_filename: file.name,
        title,
      });
      if (queueError) {
        // Don't leave an orphaned object if the queue row failed.
        await supabase.storage.from("fs-inbox").remove([objectPath]);
        throw new Error(queueError.message);
      }
      router.refresh();
    } catch (e) {
      setError(`Upload failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-60"
      >
        <UploadIcon className="size-4" />
        {busy ? "Uploading…" : "Upload a recording — the Studio will transcribe it"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
