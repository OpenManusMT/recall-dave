from dataclasses import dataclass
from typing import Optional

@dataclass
class ReviewObservation:
    independent: bool
    clue_level: int
    correct: bool
    elapsed_days: float

def scheduler_grade(obs: ReviewObservation) -> str:
    """Reference mapping only. Production scheduler should preserve richer evidence."""
    if not obs.correct or obs.clue_level >= 5:
        return "AGAIN"
    if obs.clue_level >= 2:
        return "HARD"
    if obs.independent and obs.elapsed_days >= 3 and obs.clue_level == 0:
        return "EASY"
    return "GOOD"
