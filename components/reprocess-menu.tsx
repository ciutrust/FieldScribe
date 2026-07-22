"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Re-transcribe an existing recording with a chosen language and/or the
 * distant-audio boost. Forcing the language fixes the far-field failure where
 * Whisper misdetects it (e.g. English → Icelandic) and hallucinates. */
export function ReprocessMenu({
  recordingId,
  forcedLanguage,
  enhanceAudio,
  onStarted,
}: {
  recordingId: string;
  forcedLanguage: string | null;
  enhanceAudio: number;
  onStarted: () => void;
}) {
  const [lang, setLang] = useState(forcedLanguage ?? "auto");
  const [boost, setBoost] = useState(enhanceAudio === 1);

  async function run() {
    const res = await fetch(`/api/recordings/${recordingId}/reprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang === "auto" ? null : lang, enhance: boost }),
    });
    if (res.ok) {
      toast.success("Re-transcribing…");
      onStarted();
    } else {
      toast.error("Couldn't re-transcribe.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" title="Re-transcribe with a chosen language / audio boost">
          <RefreshCw className="size-3.5" /> Re-transcribe
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
          <DropdownMenuRadioItem value="auto">Auto-detect</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="pt">Português</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={boost}
          onCheckedChange={setBoost}
          onSelect={(e) => e.preventDefault()}
        >
          Boost distant audio
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={run} className="justify-center font-medium text-flare">
          Re-transcribe now
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
