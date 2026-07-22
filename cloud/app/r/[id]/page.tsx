import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MonitorSpeaker } from "lucide-react";
import { RecordingPager } from "@/components/recording-pager";
import { SummaryPanel, Heading } from "@/components/summary-panel";
import { Timeline } from "@/components/timeline";
import { Transcript } from "@/components/transcript";
import { TranscriptActions } from "@/components/transcript-actions";
import { createClient } from "@/lib/supabase/server";
import type { FsRecording, FsSpeaker, FsSummary, FsUtterance } from "@/lib/types";
import { buildRecordingMarkdown, exportFilename } from "@/lib/export";
import { defaultSpeakerName, formatDate, formatDuration, speakerBg } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [recordingRes, utterancesRes, speakersRes, summaryRes, orderRes] = await Promise.all([
    supabase.from("fs_recordings").select("*").eq("id", id).maybeSingle(),
    supabase.from("fs_utterances").select("*").eq("recording_id", id).order("start_sec"),
    supabase.from("fs_speakers").select("*").eq("recording_id", id).order("position"),
    supabase.from("fs_summaries").select("*").eq("recording_id", id).maybeSingle(),
    supabase.from("fs_recordings").select("id").order("recorded_at", { ascending: false }),
  ]);

  const recording = recordingRes.data as FsRecording | null;
  if (!recording) notFound();

  // Prev/next in library order (newest first) for the pager.
  const orderedIds = ((orderRes.data ?? []) as { id: string }[]).map((r) => r.id);
  const idx = orderedIds.indexOf(id);
  const prevId = idx > 0 ? orderedIds[idx - 1] : null;
  const nextId = idx >= 0 && idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;
  const utterances = (utterancesRes.data ?? []) as FsUtterance[];
  const speakers = (speakersRes.data ?? []) as FsSpeaker[];
  const summary = (summaryRes.data as FsSummary | null) ?? null;

  const orderedLabels = speakers.map((s) => s.speaker_label);
  const names: Record<string, string> = {};
  speakers.forEach((s) => {
    names[s.speaker_label] = s.display_name?.trim() || defaultSpeakerName(s.position);
  });

  const markdown = buildRecordingMarkdown(recording, utterances, names, summary);

  return (
    // App-style fixed layout: title + graph never move; only the transcript
    // pane below scrolls.
    <div className="fixed inset-x-0 top-14 bottom-0 flex flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col px-4 md:px-8">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 pt-5 pb-3">
          <div className="min-w-0 flex-1 basis-64 space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> library
            </Link>
            <h1 className="truncate text-xl font-semibold tracking-tight">{recording.title}</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              {formatDate(recording.recorded_at)}
              {recording.duration_sec != null && <> · {formatDuration(recording.duration_sec)}</>}
              {recording.language && <> · {recording.language}</>}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <RecordingPager prevId={prevId} nextId={nextId} />
            {utterances.length > 0 && (
              <TranscriptActions
                markdown={markdown}
                filename={exportFilename(recording.title, "md")}
              />
            )}
          </div>
        </div>

        {/* Frozen graph — never scrolls */}
        <div className="shrink-0 pb-3">
          <Timeline
            utterances={utterances}
            orderedLabels={orderedLabels}
            names={names}
            durationSec={recording.duration_sec ?? 0}
          />
        </div>

        {/* Only this pane scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 pt-1">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
            <Transcript utterances={utterances} orderedLabels={orderedLabels} names={names} />
            <aside className="space-y-6 md:order-last">
              <section className="space-y-2">
                <Heading>Speakers</Heading>
                <ul className="space-y-1.5">
                  {speakers.map((s) => (
                    <li key={s.speaker_label} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={cn("size-2.5 shrink-0 rounded-full", speakerBg(s.position))}
                      />
                      {names[s.speaker_label]}
                    </li>
                  ))}
                </ul>
              </section>
              <SummaryPanel summary={summary} />
              <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                <MonitorSpeaker className="mt-0.5 size-3.5 shrink-0" />
                Audio playback and edits live on the Mac Studio.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
