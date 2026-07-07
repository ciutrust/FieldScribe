"""Pure merge logic: Whisper words + pyannote speaker turns -> utterances.

Same approach as WhisperX: each word goes to the speaker turn it overlaps most;
words with no overlap go to the nearest turn. Consecutive words from the same
speaker are grouped into one utterance, split on gaps longer than MAX_GAP_SEC.
"""

from dataclasses import dataclass

MAX_GAP_SEC = 2.0


@dataclass(frozen=True)
class Word:
    start: float
    end: float
    text: str


@dataclass(frozen=True)
class Turn:
    start: float
    end: float
    speaker: str


@dataclass(frozen=True)
class Utterance:
    speaker: str
    start: float
    end: float
    text: str


def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))


def assign_speaker(word: Word, turns: list[Turn]) -> str:
    # Most overlap wins; on a tie (crosstalk), the shorter turn wins — an
    # interjection inside a long turn usually owns the words it covers.
    best, best_key = None, (0.0, 0.0)
    for turn in turns:
        ov = _overlap(word.start, word.end, turn.start, turn.end)
        key = (ov, turn.start - turn.end)
        if ov > 0 and key > best_key:
            best, best_key = turn, key
    if best is not None:
        return best.speaker
    # No overlap (e.g. word in a diarization gap): nearest turn by center distance.
    center = (word.start + word.end) / 2
    nearest = min(turns, key=lambda t: min(abs(center - t.start), abs(center - t.end)))
    return nearest.speaker


def merge(words: list[Word], turns: list[Turn]) -> list[Utterance]:
    if not words:
        return []
    if not turns:
        turns = [Turn(words[0].start, words[-1].end, "SPEAKER_00")]

    utterances: list[Utterance] = []
    current_words: list[Word] = []
    current_speaker: str | None = None

    def flush() -> None:
        if current_words and current_speaker is not None:
            text = " ".join(w.text.strip() for w in current_words if w.text.strip())
            if text:
                utterances.append(
                    Utterance(current_speaker, current_words[0].start, current_words[-1].end, text)
                )

    for word in words:
        speaker = assign_speaker(word, turns)
        gap = word.start - current_words[-1].end if current_words else 0.0
        if speaker != current_speaker or gap > MAX_GAP_SEC:
            flush()
            current_words, current_speaker = [], speaker
        current_words.append(word)
    flush()
    return utterances


def speaker_labels_in_order(utterances: list[Utterance]) -> list[str]:
    """Distinct speakers by first appearance — drives 'Speaker 1/2/…' numbering."""
    seen: list[str] = []
    for u in utterances:
        if u.speaker not in seen:
            seen.append(u.speaker)
    return seen
