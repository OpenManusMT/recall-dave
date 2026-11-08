
import json, os, sys, unittest
from collections import Counter
ROOT=os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0,ROOT)
from evaluate import evaluate

def load(name):
    with open(os.path.join(ROOT,name),encoding="utf-8") as f:
        return [json.loads(x) for x in f if x.strip()]

class HarnessTests(unittest.TestCase):
    def test_exactly_100_cases(self):
        self.assertEqual(len(load("cases.jsonl")),100)

    def test_required_primary_categories_present(self):
        cases=load("cases.jsonl")
        c=Counter(x["tags"][0] for x in cases)
        self.assertEqual(c["correct_paraphrase"],20)
        self.assertEqual(c["partial_recall"],20)
        self.assertEqual(c["wrong_answer"],20)
        self.assertEqual(c["contradiction"],20)
        self.assertEqual(c["vague_answer"],10)
        self.assertEqual(c["asr_error"],10)

    def test_difficult_chunks_present(self):
        cases=load("cases.jsonl")
        self.assertEqual(sum("deliberately_difficult_chunk" in x["tags"] for x in cases),25)

    def test_all_clue_levels_covered(self):
        levels={x["expected"].get("clue_level") for x in load("cases.jsonl")}
        self.assertTrue({0,1,2,3,4,5}.issubset(levels))

    def test_asr_cases_unscoreable(self):
        for x in load("cases.jsonl"):
            if x["tags"][0]=="asr_error":
                self.assertFalse(x["expected"]["memory_scoreable"])
                self.assertEqual(x["expected"]["action"],"confirm_transcript")
                self.assertIn("confirmed_transcript",x["asr"])

    def test_oracle_passes(self):
        cases=load("cases.jsonl")
        preds=load("oracle_predictions.jsonl")
        r=evaluate(cases,preds,5)
        self.assertEqual(r["gate"],"PASS")
        self.assertTrue(r["production_schedule_allowed"])

    def test_baseline_fails(self):
        cases=load("cases.jsonl")
        preds=load("baseline_predictions.jsonl")
        r=evaluate(cases,preds,5)
        self.assertEqual(r["gate"],"FAIL")
        self.assertFalse(r["production_schedule_allowed"])

if __name__=="__main__":
    unittest.main()
