import type { FsRecording, FsSummary, FsUtterance } from "@/lib/types";
import { formatClock, formatDate, formatDuration } from "@/lib/format";

/** Full transcript document — same shape as the Mac app's Markdown export:
 * title, summary + action items (when present), then the speaker-labeled body. */
export function buildRecordingMarkdown(
  recording: FsRecording,
  utterances: FsUtterance[],
  names: Record<string, string>,
  summary: FsSummary | null
): string {
  const lines: string[] = [`# ${recording.title}`, ""];
  const meta = [formatDate(recording.recorded_at)];
  if (recording.duration_sec != null) meta.push(formatDuration(recording.duration_sec));
  if (recording.language) meta.push(recording.language);
  lines.push(meta.join(" · "), "");

  if (summary) {
    lines.push("## Summary", "", summary.summary_md.trim(), "");
    const actions = Array.isArray(summary.actions) ? summary.actions : [];
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
    const name = names[u.speaker_label] ?? u.speaker_label;
    lines.push(`**${name}** (${formatClock(u.start_sec)}): ${u.text}`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
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
