#!/bin/bash
# Generates a deterministic 2-speaker test clip with macOS voices.
# Ground truth: Samantha speaks segments 1,3,5 — Daniel speaks 2,4,6.
set -euo pipefail

OUT_DIR="${1:-data/test}"
mkdir -p "$OUT_DIR"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

seg() { # voice, index, text
  say -v "$1" -o "$TMP/$2.aiff" "$3"
}

seg Samantha 1 "Good morning everyone, let's get started with the quarterly review. I want to walk through the pipeline numbers first."
seg Daniel   2 "Thanks for kicking this off. Before we dive in, I have one question about the renewal forecast from last week."
seg Samantha 3 "Great question. The renewal forecast moved up by twelve percent after we closed the enterprise deal on Friday."
seg Daniel   4 "That's excellent news. In that case I will update the board slides tonight and send them around for review."
seg Samantha 5 "Perfect. One more thing: we need a volunteer to run the customer workshop in Austin next month."
seg Daniel   6 "I can take the workshop. Austin is an easy trip for me and I already know two of the customers attending."

# ~0.6s of silence between turns so the diarizer has clean boundaries
ffmpeg -y -f lavfi -i anullsrc=r=22050:cl=mono -t 0.6 "$TMP/sil.wav" -loglevel error
for i in 1 2 3 4 5 6; do
  ffmpeg -y -i "$TMP/$i.aiff" -ar 22050 -ac 1 "$TMP/$i.wav" -loglevel error
done

printf "file '%s'\nfile '%s'\n" \
  "$TMP/1.wav" "$TMP/sil.wav" > "$TMP/list.txt"
for i in 2 3 4 5 6; do
  printf "file '%s'\nfile '%s'\n" "$TMP/$i.wav" "$TMP/sil.wav" >> "$TMP/list.txt"
done

ffmpeg -y -f concat -safe 0 -i "$TMP/list.txt" "$OUT_DIR/two-speaker.wav" -loglevel error
echo "wrote $OUT_DIR/two-speaker.wav"
afinfo "$OUT_DIR/two-speaker.wav" | grep "estimated duration" || true
