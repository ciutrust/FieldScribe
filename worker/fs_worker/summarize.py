"""AI summary + action items via Claude Haiku with structured output.

Returns None when no API key is configured so the pipeline still completes;
callers treat a summary failure as non-fatal (the transcript is the product).
"""

from pydantic import BaseModel

MODEL = "claude-haiku-4-5"

SYSTEM = """You summarize transcripts of meetings, calls, and voice memos.
Write in the same language as the transcript. Be specific: keep names, numbers,
dates, and decisions. No preamble — start with the substance."""


class Action(BaseModel):
    text: str
    owner: str | None


class SummaryOutput(BaseModel):
    summary_md: str
    actions: list[Action]


def build_transcript_text(utterances, speaker_names: dict[str, str]) -> str:
    lines = []
    for u in utterances:
        name = speaker_names.get(u.speaker, u.speaker)
        lines.append(f"[{int(u.start // 60)}:{int(u.start % 60):02d}] {name}: {u.text}")
    return "\n".join(lines)


def summarize(utterances, speaker_names: dict[str, str], api_key: str | None):
    """Returns (summary_md, actions list-of-dicts, model) or None to skip."""
    if not api_key:
        return None

    import anthropic  # lazy: keep worker startup fast

    client = anthropic.Anthropic(api_key=api_key)
    transcript = build_transcript_text(utterances, speaker_names)

    prompt = (
        "Summarize this transcript as short markdown (a few sentences or bullets, "
        "bold the key facts). Then list concrete action items — only real commitments "
        "or tasks someone should do, with the speaker's name as owner when clear. "
        "Empty list if there are none.\n\n<transcript>\n" + transcript + "\n</transcript>"
    )

    response = client.messages.parse(
        model=MODEL,
        max_tokens=8000,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        output_format=SummaryOutput,
    )
    result = response.parsed_output
    if result is None:
        return None
    return (
        result.summary_md,
        [a.model_dump() for a in result.actions],
        MODEL,
    )
