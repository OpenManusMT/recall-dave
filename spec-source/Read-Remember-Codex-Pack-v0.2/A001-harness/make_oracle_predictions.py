
import json, argparse

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--cases", default="cases.jsonl")
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--out", default="oracle_predictions.jsonl")
    args=ap.parse_args()
    cases=[json.loads(x) for x in open(args.cases,encoding="utf-8") if x.strip()]
    with open(args.out,"w",encoding="utf-8") as out:
        for run_id in range(1,args.runs+1):
            for c in cases:
                e=c["expected"]
                score=None
                if e.get("memory_scoreable"):
                    lo,hi=e["score_range"]; score=round((lo+hi)/2,3)
                row={
                    "case_id":c["case_id"],"run_id":run_id,
                    "label":e["label"],"score":score,
                    "clue_level":e.get("clue_level"),"action":e["action"],
                    "evidence":["golden oracle used only to verify harness mechanics"]
                }
                out.write(json.dumps(row,ensure_ascii=False)+"\n")

if __name__=="__main__":
    main()
