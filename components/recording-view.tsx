"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RotateCcw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import type { Recording, Speaker, Summary, Utterance } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";
import { RecordingPager } from "@/components/recording-pager";
import { SpeakerRail } from "@/components/speaker-rail";
import { StatusChip } from "@/components/status-chip";
import { SummaryPanel } from "@/components/summary-panel";
import { Timeline } from "@/components/timeline";
import { TitleEditor } from "@/components/title-editor";
import { Transcript } from "@/components/transcript";
import { defaultSpeakerName, formatDate, formatDuration } from "@/lib/format";
import { STATUS_LABEL, isActive } from "@/lib/status";

type Detail = {
  recording: Recording;
  utterances: Utterance[];
  speakers: Speaker[];
  summary: Summary | null;
};

const POLL_MS = 2500;

export function RecordingView({
  id,
  prevId,
  nextId,
}: {
  id: string;
  prevId: string | null;
  nextId: string | null;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const refresh = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch(`/api/recordings/${id}`);
      if (res.status === 404) {
        setMissing(true);
        return;
      }
      const data = (await res.json()) as Detail;
      setDetail(data);
      if (isActive(data.recording.status)) timer.current = setTimeout(refresh, POLL_MS);
    } catch {
      timer.current = setTimeout(refresh, POLL_MS);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  // Deep link from search results: /r/<id>?t=<seconds> positions the playhead.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !detail) return;
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (isFinite(t) && t > 0 && audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
    deepLinked.current = true;
  }, [detail]);

  const seek = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    setCurrentTime(sec);
    if (audio.paused) audio.play().catch(() => {});
  }, []);

  // Timeline segment click: seek AND center that utterance in the transcript,
  // so the pinned graph never leaves view while the text jumps to the moment.
  const selectUtterance = useCallback(
    (u: Utterance) => {
      seek(u.startSec);
      document
        .getElementById(`u-${u.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [seek]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  async function retry() {
    const res = await fetch(`/api/recordings/${id}/retry`, { method: "POST" });
    if (res.ok) {
      toast.success("Queued again");
      refresh();
    } else toast.error("Could not retry.");
  }

  async function reprocess() {
    const res = await fetch(`/api/recordings/${id}/reprocess`, { method: "POST" });
    if (res.ok) {
      toast.success("Re-transcribing with the distant-audio boost…");
      refresh();
    } else toast.error("Couldn't re-transcribe.");
  }

  if (missing) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-muted-foreground">This recording doesn&apos;t exist.</p>
        <Button asChild variant="secondary">
          <Link href="/">Back to library</Link>
        </Button>
      </div>
    );
  }
  if (!detail) {
    return <p className="py-16 text-center font-mono text-xs text-muted-foreground">loading…</p>;
  }

  const { recording, utterances, speakers, summary } = detail;
  const orderedLabels = speakers.map((s) => s.speakerLabel);
  const names: Record<string, string> = {};
  orderedLabels.forEach((label, i) => {
    names[label] = speakers[i].displayName?.trim() || defaultSpeakerName(i);
  });
  const durationSec = recording.durationSec ?? 0;
  const processing = isActive(recording.status);

  return (
    // App-style fixed layout: header/title/graph/player never move —
    // only the transcript pane scrolls.
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
          <TitleEditor recordingId={id} title={recording.title} onSaved={refresh} />
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatDate(recording.createdAt)}
            {recording.durationSec != null && <> · {formatDuration(recording.durationSec)}</>}
            {recording.language && <> · {recording.language}</>}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <RecordingPager prevId={prevId} nextId={nextId} />
          <StatusChip status={recording.status} />
          {recording.status === "failed" && (
            <Button size="sm" variant="secondary" onClick={retry}>
              <RotateCcw className="size-3.5" /> Retry
            </Button>
          )}
          {utterances.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="secondary" asChild>
                <a href={`/api/recordings/${id}/export/md`} download>
                  <Download className="size-3.5" /> Markdown
                </a>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <a href={`/api/recordings/${id}/export/srt`} download>
                  <Download className="size-3.5" /> SRT
                </a>
              </Button>
            </div>
          )}
          {(recording.status === "done" || recording.status === "failed") && (
            <Button
              size="sm"
              variant="secondary"
              onClick={reprocess}
              title="Re-transcribe with a boost for quiet / far-from-mic audio"
            >
              <Volume2 className="size-3.5" />
              {recording.enhanceAudio ? "Re-transcribe (boosted)" : "Boost audio"}
            </Button>
          )}
        </div>
      </div>

      {recording.status === "failed" && recording.error && (
        <div className="mb-3 shrink-0 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {recording.error}
        </div>
      )}

      {processing && (
        <div className="shrink-0 rounded-xl border bg-card px-5 py-10 text-center">
          <p className="font-mono text-xs text-muted-foreground animate-pulse">
            {STATUS_LABEL[recording.status]}…
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This page updates itself — a 1-hour file takes roughly 5–15 minutes.
          </p>
        </div>
      )}

      {utterances.length > 0 && (
        <>
          {/* Frozen graph — never scrolls */}
          <div className="shrink-0 pb-3">
            <Timeline
              utterances={utterances}
              orderedLabels={orderedLabels}
              names={names}
              durationSec={durationSec}
              currentTime={currentTime}
              onSeek={seek}
              onSelect={selectUtterance}
            />
          </div>
          {/* Only this pane scrolls */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 pt-1">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
              <Transcript
                utterances={utterances}
                orderedLabels={orderedLabels}
                names={names}
                currentTime={currentTime}
                onSeek={seek}
              />
              <aside className="space-y-6 md:order-last">
                <SpeakerRail
                  recordingId={id}
                  speakers={speakers}
                  orderedLabels={orderedLabels}
                  onRenamed={refresh}
                />
                <SummaryPanel summary={summary} skipped={recording.skipSummary === 1} />
              </aside>
            </div>
          </div>
        </>
      )}

      <audio
        ref={audioRef}
        src={`/api/recordings/${id}/audio`}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      {utterances.length > 0 && (
        <AudioPlayer
          playing={playing}
          currentTime={currentTime}
          durationSec={durationSec}
          onToggle={toggle}
          onSeek={seek}
        />
      )}
      </div>
    </div>
  );
}
