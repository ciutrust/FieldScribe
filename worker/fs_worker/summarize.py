"""AI summary + action items via Claude. Filled in by the summary feature step;
returns None when no API key is configured so the pipeline still completes."""


def summarize(utterances, speaker_names: dict[str, str], api_key: str | None):
    """Returns (summary_md, actions_json, model) or None to skip."""
    if not api_key:
        return None
    raise NotImplementedError("summary step lands with the summary feature")
