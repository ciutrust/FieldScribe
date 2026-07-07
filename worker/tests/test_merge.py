from fs_worker.merge import Turn, Utterance, Word, assign_speaker, merge, speaker_labels_in_order


def w(start, end, text):
    return Word(start=start, end=end, text=text)


def t(start, end, speaker):
    return Turn(start=start, end=end, speaker=speaker)


class TestAssignSpeaker:
    def test_full_overlap(self):
        turns = [t(0, 5, "SPEAKER_00"), t(5, 10, "SPEAKER_01")]
        assert assign_speaker(w(1, 2, "hi"), turns) == "SPEAKER_00"
        assert assign_speaker(w(6, 7, "yo"), turns) == "SPEAKER_01"

    def test_straddling_word_goes_to_larger_overlap(self):
        turns = [t(0, 5, "SPEAKER_00"), t(5, 10, "SPEAKER_01")]
        # 4.8-5.4: 0.2s in turn 0, 0.4s in turn 1
        assert assign_speaker(w(4.8, 5.4, "well"), turns) == "SPEAKER_01"

    def test_word_in_gap_goes_to_nearest_turn(self):
        turns = [t(0, 4, "SPEAKER_00"), t(8, 12, "SPEAKER_01")]
        assert assign_speaker(w(4.5, 5.0, "um"), turns) == "SPEAKER_00"
        assert assign_speaker(w(7.0, 7.5, "so"), turns) == "SPEAKER_01"

    def test_overlapping_turns_prefers_dominant(self):
        # crosstalk: both speakers active, word sits mostly in SPEAKER_01's turn
        turns = [t(0, 10, "SPEAKER_00"), t(2, 3, "SPEAKER_01")]
        assert assign_speaker(w(2.0, 2.9, "no"), turns) == "SPEAKER_01"


class TestMerge:
    def test_empty_words(self):
        assert merge([], [t(0, 5, "SPEAKER_00")]) == []

    def test_no_turns_falls_back_to_single_speaker(self):
        words = [w(0, 1, "hello"), w(1, 2, "world")]
        result = merge(words, [])
        assert result == [Utterance("SPEAKER_00", 0, 2, "hello world")]

    def test_groups_consecutive_same_speaker(self):
        turns = [t(0, 5, "SPEAKER_00"), t(5, 10, "SPEAKER_01")]
        words = [w(0, 1, "hello"), w(1, 2, "there"), w(6, 7, "hi"), w(7, 8, "back")]
        result = merge(words, turns)
        assert result == [
            Utterance("SPEAKER_00", 0, 2, "hello there"),
            Utterance("SPEAKER_01", 6, 8, "hi back"),
        ]

    def test_splits_on_long_gap_same_speaker(self):
        turns = [t(0, 20, "SPEAKER_00")]
        words = [w(0, 1, "first"), w(1, 2, "thought"), w(8, 9, "second"), w(9, 10, "thought")]
        result = merge(words, turns)
        assert [u.text for u in result] == ["first thought", "second thought"]
        assert all(u.speaker == "SPEAKER_00" for u in result)

    def test_speaker_change_mid_stream(self):
        turns = [t(0, 3, "SPEAKER_00"), t(3, 6, "SPEAKER_01"), t(6, 9, "SPEAKER_00")]
        words = [w(0.5, 1, "a"), w(3.5, 4, "b"), w(6.5, 7, "c")]
        result = merge(words, turns)
        assert [(u.speaker, u.text) for u in result] == [
            ("SPEAKER_00", "a"),
            ("SPEAKER_01", "b"),
            ("SPEAKER_00", "c"),
        ]

    def test_whitespace_only_words_dropped(self):
        turns = [t(0, 5, "SPEAKER_00")]
        words = [w(0, 1, " hello"), w(1, 2, "  "), w(2, 3, "world ")]
        result = merge(words, turns)
        assert result == [Utterance("SPEAKER_00", 0, 3, "hello world")]

    def test_whisper_word_spacing_normalized(self):
        # Whisper words come with leading spaces (" hello"); merge joins on single space
        turns = [t(0, 5, "SPEAKER_00")]
        words = [w(0, 1, " Hello,"), w(1, 2, " how"), w(2, 3, " are"), w(3, 4, " you?")]
        assert merge(words, turns)[0].text == "Hello, how are you?"


class TestSpeakerLabels:
    def test_order_of_first_appearance(self):
        utts = [
            Utterance("SPEAKER_01", 0, 1, "hi"),
            Utterance("SPEAKER_00", 1, 2, "hey"),
            Utterance("SPEAKER_01", 2, 3, "sup"),
        ]
        assert speaker_labels_in_order(utts) == ["SPEAKER_01", "SPEAKER_00"]
