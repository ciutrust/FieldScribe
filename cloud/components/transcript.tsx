"use client";

import { Fragment, useEffect } from "react";
import type { FsUtterance } from "@/lib/types";
import { formatClock, speakerText } from "@/lib/format";
import { scrollToUtterance } from "@/lib/scroll";
import { cn } from "@/lib/utils";

type Block = { speakerLabel: string; utterances: FsUtterance[] };

function toBlocks(utterances: FsUtterance[]): Block[] {
  const blocks: Block[] = [];
  for (const u of utterances) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerLabel === u.speaker_label) last.utterances.push(u);
    else blocks.push({ speakerLabel: u.speaker_label, utterances: [u] });
  }
  return blocks;
}

/** Read-only transcript. Each utterance carries an #u-<id> anchor so the
 * timeline and search results can deep-link into it (highlight via :target). */
export function Transcript({
  utterances,
  orderedLabels,
  names,
}: {
  utterances: FsUtterance[];
  orderedLabels: string[];
  names: Record<string, string>;
}) {
  const speakerIndex = (label: string) => Math.max(0, orderedLabels.indexOf(label));

  // Arriving from a search deep link (#u-<id>): center the target under the
  // pinned timeline. Delayed so it wins over the router's own late hash-scroll.
  useEffect(() => {
    const match = window.location.hash.match(/^#u-(\d+)$/);
    if (!match) return;
    const timer = setTimeout(() => scrollToUtterance(match[1]), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-5">
      {toBlocks(utterances).map((block) => (
        <div key={block.utterances[0].id}>
          <div className="mb-1 flex items-baseline gap-2.5">
            <span
              className={cn("text-[13px] font-semibold", speakerText(speakerIndex(block.speakerLabel)))}
            >
              {names[block.speakerLabel] ?? block.speakerLabel}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatClock(block.utterances[0].start_sec)}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {block.utterances.map((u) => (
              <Fragment key={u.id}>
                <span id={`u-${u.id}`} className="scroll-mt-56 rounded-sm px-0.5 -mx-0.5">
                  {u.text}
                </span>{" "}
              </Fragment>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}
