
import re, math

STOP={"the","a","an","and","or","to","of","in","on","for","with","is","are","was","were","it","that","this",
      "as","at","by","from","be","but","if","so","than","they","their","them","into","when","which","also"}

def toks(s):
    return {w for w in re.findall(r"[a-z0-9£]+", s.lower()) if w not in STOP and len(w)>2}

def score_case(case):
    r=toks(case["spoken_transcript"])
    idea_tokens=set()
    for k in case["key_ideas"]:
        idea_tokens |= toks(k["text"])
    overlap=len(r & idea_tokens)/max(1,len(idea_tokens))
    # Intentionally simplistic: illustrates why lexical overlap alone is not acceptable.
    if overlap >= 0.55:
        label, action, clue = "correct","accept",0
        score=min(0.95, 0.55+0.6*overlap)
    elif overlap >= 0.25:
        label, action, clue = "partial","prompt_more",1
        score=0.45+0.5*overlap
    elif overlap >= 0.08:
        label, action, clue = "vague","prompt_specifics",1
        score=0.20+0.5*overlap
    else:
        label, action, clue = "incorrect","give_clue",3
        score=min(0.20, overlap)

    return {
        "label":label,
        "score":round(score,3),
        "clue_level":clue,
        "action":action,
        "evidence":["lexical-overlap baseline only"]
    }
