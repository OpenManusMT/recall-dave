
import argparse, importlib, json, sys
from pathlib import Path

def load_cases(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(x) for x in f if x.strip()]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--cases", default="cases.jsonl")
    ap.add_argument("--scorer", default="baseline_scorer:score_case",
                    help="Python module:function, e.g. my_scorer:score_case")
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--out", default="predictions.jsonl")
    args=ap.parse_args()

    mod_name, fn_name=args.scorer.split(":",1)
    fn=getattr(importlib.import_module(mod_name), fn_name)

    cases=load_cases(args.cases)
    with open(args.out,"w",encoding="utf-8") as out:
        for run_id in range(1,args.runs+1):
            for c in cases:
                p=fn(c)
                row={"case_id":c["case_id"],"run_id":run_id,**p}
                out.write(json.dumps(row, ensure_ascii=False)+"\n")
    print(f"Wrote {len(cases)*args.runs} predictions to {args.out}")

if __name__=="__main__":
    main()
