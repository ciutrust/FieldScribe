"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Recording, Speaker, Summary, Utterance } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";
import { SpeakerRail } from "@/components/speaker-rail";
import { StatusChip } from "@/components/status-chip";
import { SummaryPanel } from "@/components/summary-panel";
import { Timeline } from "@/components/timeline";
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

export function RecordingView({ id }: { id: string }) {
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> library
          </Link>
          <h1 className="truncate text-xl font-semibold tracking-tight">{recording.title}</h1>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatDate(recording.createdAt)}
            {recording.durationSec != null && <> · {formatDuration(recording.durationSec)}</>}
            {recording.language && <> · {recording.language}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
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
        </div>
      </div>

      {recording.status === "failed" && recording.error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {recording.error}
        </div>
      )}

      {processing && (
        <div className="rounded-xl border bg-card px-5 py-10 text-center">
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
          <Timeline
            utterances={utterances}
            orderedLabels={orderedLabels}
            names={names}
            durationSec={durationSec}
            currentTime={currentTime}
            onSeek={seek}
          />
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
  );
}
