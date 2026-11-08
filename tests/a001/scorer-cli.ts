// JSON-lines bridge so the unchanged Python A001 harness can call the TypeScript candidate scorer.
// Reads {"source_text","key_ideas":[{"idea_id","text"}],"transcript"} per line; writes one result per line.
import { createInterface } from 'node:readline';
import { scoreRecallLocally } from '../../packages/core/src/scorer';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let out: Record<string, unknown>;
  try {
    const req = JSON.parse(line) as {
      source_text: string;
      key_ideas: { idea_id: string; text: string }[];
      transcript: string;
    };
    const r = scoreRecallLocally({
      sourceText: String(req.source_text ?? ''),
      keyIdeas: (req.key_ideas ?? []).map((k) => ({ id: String(k.idea_id), text: String(k.text) })),
      transcript: String(req.transcript ?? ''),
    });
    out = {
      label: r.label,
      score: r.score,
      clue_level: r.clueLevel,
      action: r.action,
      evidence: r.evidence,
    };
  } catch (e) {
    out = { error: (e as Error).message };
  }
  process.stdout.write(JSON.stringify(out) + '\n');
});
