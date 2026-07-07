import type { Recording, Summary, Utterance } from "@/db/schema";
import { formatClock, formatDate, formatDuration } from "@/lib/format";

type Action = { text: string; owner?: string | null };

export function buildMarkdown(
  recording: Recording,
  utterances: Utterance[],
  names: Record<string, string>,
  summary: Summary | null
): string {
  const lines: string[] = [`# ${recording.title}`, ""];
  const meta = [formatDate(recording.createdAt)];
  if (recording.durationSec != null) meta.push(formatDuration(recording.durationSec));
  if (recording.language) meta.push(recording.language);
  lines.push(meta.join(" · "), "");

  if (summary) {
    lines.push("## Summary", "", summary.summaryMd.trim(), "");
    let actions: Action[] = [];
    try {
      actions = JSON.parse(summary.actionsJson) as Action[];
    } catch {
      actions = [];
    }
    if (actions.length > 0) {
      lines.push("## Action items", "");
      for (const a of actions) {
        lines.push(`- [ ] ${a.text}${a.owner ? ` — ${a.owner}` : ""}`);
      }
      lines.push("");
    }
  }

  lines.push("## Transcript", "");
  for (const u of utterances) {
    const name = names[u.speakerLabel] ?? u.speakerLabel;
    lines.push(`**${name}** (${formatClock(u.startSec)}): ${u.text}`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function srtTime(sec: number): string {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped % 1) * 1000);
  return (
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`
  );
}

export function buildSrt(utterances: Utterance[], names: Record<string, string>): string {
  const blocks = utterances.map((u, i) => {
    const name = names[u.speakerLabel] ?? u.speakerLabel;
    return `${i + 1}\n${srtTime(u.startSec)} --> ${srtTime(u.endSec)}\n${name}: ${u.text}`;
  });
  return blocks.join("\n\n") + "\n";
}

/** Filesystem-safe filename base from a recording title. */
export function exportFilename(title: string, ext: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recording";
  return `${slug}.${ext}`;
}
