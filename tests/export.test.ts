import { describe, expect, it } from "vitest";
import { buildMarkdown, buildSrt, exportFilename } from "@/lib/export";
import type { Recording, Summary, Utterance } from "@/db/schema";

const recording: Recording = {
  id: "r1",
  title: "Quarterly review",
  originalFilename: "q.wav",
  storedExt: "wav",
  durationSec: 125,
  language: "en",
  status: "done",
  error: null,
  skipSummary: 0,
  createdAt: "2026-07-07T18:20:00Z",
  updatedAt: "2026-07-07T18:25:00Z",
  cloudSyncedAt: null,
};

const utterances: Utterance[] = [
  { id: 1, recordingId: "r1", speakerLabel: "SPEAKER_00", startSec: 0, endSec: 6.3, text: "Good morning everyone." },
  { id: 2, recordingId: "r1", speakerLabel: "SPEAKER_01", startSec: 6.9, endSec: 12.4, text: "Thanks for kicking this off." },
];

const names = { SPEAKER_00: "Alex", SPEAKER_01: "Sam" };

const summary: Summary = {
  recordingId: "r1",
  summaryMd: "**Renewals up 12%.**",
  actionsJson: JSON.stringify([
    { text: "Update board slides", owner: "Sam" },
    { text: "Book the venue" },
  ]),
  model: "claude-haiku-4-5",
  createdAt: "2026-07-07T18:25:00Z",
};

describe("buildMarkdown", () => {
  it("includes title, summary, checklist actions, and named transcript", () => {
    const md = buildMarkdown(recording, utterances, names, summary);
    expect(md).toContain("# Quarterly review");
    expect(md).toContain("2:05 · en");
    expect(md).toContain("## Summary");
    expect(md).toContain("**Renewals up 12%.**");
    expect(md).toContain("- [ ] Update board slides — Sam");
    expect(md).toContain("- [ ] Book the venue");
    expect(md).not.toContain("Book the venue —");
    expect(md).toContain("**Alex** (0:00): Good morning everyone.");
    expect(md).toContain("**Sam** (0:06): Thanks for kicking this off.");
  });

  it("omits summary sections when there is no summary", () => {
    const md = buildMarkdown(recording, utterances, names, null);
    expect(md).not.toContain("## Summary");
    expect(md).not.toContain("## Action items");
    expect(md).toContain("## Transcript");
  });

  it("survives malformed actions json", () => {
    const md = buildMarkdown(recording, utterances, names, { ...summary, actionsJson: "not json" });
    expect(md).toContain("## Summary");
    expect(md).not.toContain("## Action items");
  });

  it("falls back to raw label when a speaker has no name", () => {
    const md = buildMarkdown(recording, utterances, { SPEAKER_00: "Alex" }, null);
    expect(md).toContain("**SPEAKER_01** (0:06):");
  });
});

describe("buildSrt", () => {
  it("formats sequential numbered cues with comma-millisecond timestamps", () => {
    const srt = buildSrt(utterances, names);
    expect(srt).toBe(
      "1\n00:00:00,000 --> 00:00:06,300\nAlex: Good morning everyone.\n\n" +
        "2\n00:00:06,900 --> 00:00:12,400\nSam: Thanks for kicking this off.\n"
    );
  });

  it("handles hour-long timestamps", () => {
    const srt = buildSrt(
      [{ id: 3, recordingId: "r1", speakerLabel: "SPEAKER_00", startSec: 3661.25, endSec: 3665, text: "Hi." }],
      names
    );
    expect(srt).toContain("01:01:01,250 --> 01:01:05,000");
  });
});

describe("exportFilename", () => {
  it("slugifies titles", () => {
    expect(exportFilename("Quarterly Review: Q3 / Q4!", "md")).toBe("quarterly-review-q3-q4.md");
  });
  it("falls back for empty slugs", () => {
    expect(exportFilename("???", "srt")).toBe("recording.srt");
  });
});
