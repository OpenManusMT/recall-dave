# Data Model

## LearnerProfile
- id
- created_at
- preferred_input: speech|typing
- target_chunk_words
- min_chunk_words
- max_chunk_words
- accessibility settings
- scheduler_mode: shadow|live

Do not include diagnosis.

## ReadingDocument
- id
- title
- source_text
- created_at
- provenance: pasted|sample|imported

## Chunk
- id
- document_id
- sequence
- source_text
- word_count
- density_score
- difficulty_tag

## KeyIdea
- id
- chunk_id
- proposition
- importance
- source_spans
- qualifiers
- relationship_type

## RecallAttempt
- id
- key_idea_id
- session_id
- occurred_at
- raw_asr_transcript nullable
- confirmed_transcript
- asr_confirmed boolean
- label
- score nullable
- clue_level nullable
- evidence_json
- response_latency_ms nullable

## ReviewState
- key_idea_id
- difficulty
- stability
- retrievability
- last_review_at
- recommended_next_at
- authoritative_next_at
- mode: shadow|live

Keeping both recommended and authoritative times makes shadow-mode evaluation explicit.

## StrategyUse
- id
- session_id
- strategy: semantic_grouping|story|self_explanation|read_aloud|other
- accepted boolean
- outcome_delta nullable

## TransferProbe
- id
- passage_id
- first_seen_at
- immediate_result
- delayed_result
- previously_practised boolean default false
