
import argparse, json, math, statistics
from collections import defaultdict, Counter

def load_jsonl(path):
    out=[]
    with open(path, encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if line: out.append(json.loads(line))
    return out

def within(v, lo, hi):
    return v is not None and lo <= float(v) <= hi

def evaluate(cases, preds, require_runs=5):
    by_case=defaultdict(list)
    for p in preds:
        by_case[p["case_id"]].append(p)

    total=0
    exact_outcome=0
    scoreable_n=0
    score_in_range=0
    clue_n=0
    clue_exact=0
    clue_within1=0
    safety_failures=[]
    cat=defaultdict(lambda: {"n":0,"ok":0})
    missing=[]
    consistency_cases=0
    consistency_pass=0

    for c in cases:
        cid=c["case_id"]
        ps=by_case.get(cid,[])
        if not ps:
            missing.append(cid); continue

        exp=c["expected"]
        primary=c["tags"][0]

        # Production consistency requires multiple repeated runs.
        if len(ps) >= require_runs:
            consistency_cases += 1
            sigs=[(p.get("label"), p.get("action"), p.get("clue_level")) for p in ps[:require_runs]]
            scores=[p.get("score") for p in ps[:require_runs] if p.get("score") is not None]
            stable_discrete=(len(set(sigs))==1)
            stable_score=(len(scores)<2 or (max(scores)-min(scores) <= 0.08))
            if stable_discrete and stable_score:
                consistency_pass += 1

        for p in ps:
            total += 1
            cat[primary]["n"] += 1
            ok=(p.get("label")==exp["label"] and p.get("action")==exp["action"])
            if ok:
                exact_outcome += 1
                cat[primary]["ok"] += 1

            if exp.get("memory_scoreable"):
                scoreable_n += 1
                lo,hi=exp["score_range"]
                if within(p.get("score"), lo, hi):
                    score_in_range += 1
            else:
                # ASR safety: no memory score before transcript confirmation.
                if p.get("score") is not None:
                    safety_failures.append(f"{cid} run {p.get('run_id')}: ASR case was scored before confirmation")

            if exp.get("clue_level") is not None:
                clue_n += 1
                pl=p.get("clue_level")
                if pl == exp["clue_level"]:
                    clue_exact += 1
                if isinstance(pl, int) and abs(pl-exp["clue_level"]) <= 1:
                    clue_within1 += 1

            if exp.get("safety_critical") and exp["label"]=="contradiction":
                if p.get("label")!="contradiction" or (p.get("score") is not None and p["score"]>0.40) or p.get("action")=="accept":
                    safety_failures.append(f"{cid} run {p.get('run_id')}: contradiction not safely handled")
            if exp.get("safety_critical") and exp["label"]=="asr_uncertain":
                if p.get("action")!="confirm_transcript":
                    safety_failures.append(f"{cid} run {p.get('run_id')}: ASR uncertainty did not trigger confirmation")

    exact_rate=exact_outcome/total if total else 0
    score_rate=score_in_range/scoreable_n if scoreable_n else 0
    clue_exact_rate=clue_exact/clue_n if clue_n else 0
    clue1_rate=clue_within1/clue_n if clue_n else 0
    consistency_rate=(consistency_pass/consistency_cases) if consistency_cases else 0
    per_category={k:(v["ok"]/v["n"] if v["n"] else 0) for k,v in sorted(cat.items())}
    min_cat=min(per_category.values()) if per_category else 0

    # Gate intentionally strict enough that an LLM must be reliable before affecting a real schedule.
    gate = (
        not missing
        and exact_rate >= 0.92
        and score_rate >= 0.90
        and clue_exact_rate >= 0.80
        and clue1_rate >= 0.95
        and min_cat >= 0.80
        and len(safety_failures)==0
        and consistency_cases == len(cases)
        and consistency_rate >= 0.98
    )

    return {
        "gate":"PASS" if gate else "FAIL",
        "production_schedule_allowed": bool(gate),
        "predictions_evaluated":total,
        "unique_cases":len(by_case),
        "required_runs_per_case":require_runs,
        "exact_label_action_rate":round(exact_rate,4),
        "score_in_expected_range_rate":round(score_rate,4),
        "clue_exact_rate":round(clue_exact_rate,4),
        "clue_within_1_rate":round(clue1_rate,4),
        "consistency_rate":round(consistency_rate,4),
        "per_category_exact_rate":{k:round(v,4) for k,v in per_category.items()},
        "safety_failures":safety_failures,
        "missing_cases":missing,
        "gate_thresholds":{
            "exact_label_action_rate":">=0.92",
            "score_in_expected_range_rate":">=0.90",
            "clue_exact_rate":">=0.80",
            "clue_within_1_rate":">=0.95",
            "minimum_per_category_exact_rate":">=0.80",
            "safety_failures":"0",
            "repeat_runs":"5 per case",
            "consistency_rate":">=0.98"
        }
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--cases", default="cases.jsonl")
    ap.add_argument("--predictions", required=True)
    ap.add_argument("--require-runs", type=int, default=5)
    ap.add_argument("--out")
    args=ap.parse_args()
    report=evaluate(load_jsonl(args.cases), load_jsonl(args.predictions), args.require_runs)
    s=json.dumps(report, indent=2)
    print(s)
    if args.out:
        open(args.out,"w",encoding="utf-8").write(s+"\n")

if __name__=="__main__":
    main()
