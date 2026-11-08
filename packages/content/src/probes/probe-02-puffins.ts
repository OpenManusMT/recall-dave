import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-02-puffins',
  title: 'Puffins at sea and on land',
  subject: 'nature',
  summary: 'Where puffins spend the winter, and where they go to raise their young.',
  density: 'medium',
  kind: 'probe',
  factNotes:
    'Atlantic puffins spend autumn and winter on the open sea and come ashore only to breed; in spring they return to colonies on grassy cliff-tops and islands, nesting in burrows they dig or take over from rabbits; each pair usually raises a single chick. Months of arrival left out. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Puffins spend the autumn and winter far out at sea, feeding on small fish and resting on the waves. They come ashore only to breed. In spring, they return to the coast, gathering in large groups on grassy cliff-tops and islands. There they nest in burrows, which they dig themselves or take over from rabbits, and each pair usually raises a single chick.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Puffins spend autumn and winter far out at sea, coming ashore only to breed.',
          sourceSpans: [
            'Puffins spend the autumn and winter far out at sea',
            'They come ashore only to breed',
          ],
          qualifiers: ['only'],
          relation: 'fact',
          topic: 'where puffins spend the winter',
          semanticCue: 'Think about whether a puffin needs land at all in the cold months.',
          clozeAnswers: ['far out at sea'],
        },
        {
          id: 's1-i2',
          text: 'In spring they gather on cliff-tops and islands and nest in burrows, which they dig or take from rabbits.',
          sourceSpans: [
            'In spring, they return to the coast, gathering in large groups on grassy cliff-tops and islands',
            'There they nest in burrows, which they dig themselves or take over from rabbits',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'where puffins nest',
          semanticCue: 'Think of an underground home on a grassy slope above the sea.',
          clozeAnswers: ['cliff-tops and islands'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'When do puffins come ashore?',
        options: [
          'In spring, to breed',
          'In winter, to shelter from storms',
          'Every night, to sleep',
        ],
        answerIndex: 0,
        explanationSpan: 'They come ashore only to breed. In spring, they return to the coast',
      },
    },
  ],
};

export default passage;
