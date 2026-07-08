"use client";

import { Fragment } from "react";
import type { Utterance } from "@/db/schema";
import { formatClock, speakerText } from "@/lib/format";
import { cn } from "@/lib/utils";

type Block = { speakerLabel: string; utterances: Utterance[] };

function toBlocks(utterances: Utterance[]): Block[] {
  const blocks: Block[] = [];
  for (const u of utterances) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerLabel === u.speakerLabel) last.utterances.push(u);
    else blocks.push({ speakerLabel: u.speakerLabel, utterances: [u] });
  }
  return blocks;
}

export function Transcript({
  utterances,
  orderedLabels,
  names,
  currentTime,
  onSeek,
}: {
  utterances: Utterance[];
  orderedLabels: string[];
  names: Record<string, string>;
  currentTime: number;
  onSeek: (sec: number) => void;
}) {
  const speakerIndex = (label: string) => Math.max(0, orderedLabels.indexOf(label));

  return (
    <div className="space-y-5">
      {toBlocks(utterances).map((block) => (
        <div key={block.utterances[0].id}>
          <div className="mb-1 flex items-baseline gap-2.5">
            <span className={cn("text-[13px] font-semibold", speakerText(speakerIndex(block.speakerLabel)))}>
              {names[block.speakerLabel] ?? block.speakerLabel}
            </span>
            <button
              onClick={() => onSeek(block.utterances[0].startSec)}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {formatClock(block.utterances[0].startSec)}
            </button>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {block.utterances.map((u) => {
              const active = currentTime >= u.startSec && currentTime < u.endSec;
              return (
                <Fragment key={u.id}>
                  <span
                    id={`u-${u.id}`}
                    onClick={() => onSeek(u.startSec)}
                    className={cn(
                      "cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors hover:bg-secondary",
                      active && "bg-flare-deep/40"
                    )}
                  >
                    {u.text}
                  </span>{" "}
                </Fragment>
              );
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
