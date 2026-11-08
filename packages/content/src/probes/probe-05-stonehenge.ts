import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-05-stonehenge',
  title: 'How Stonehenge grew',
  subject: 'history',
  summary: 'How Stonehenge was built over many centuries, and where its smaller stones came from.',
  density: 'medium',
  kind: 'probe',
  factNotes:
    'English Heritage: Stonehenge was built in stages; the first monument, a circular ditch and bank, dates from about 3000 BC (about 5,000 years ago); the stones were raised and rearranged over many centuries; the bluestones came from the Preseli Hills in west Wales, roughly 150 miles away; how they were moved is still debated. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Stonehenge, on Salisbury Plain in Wiltshire, was not built all at once. Work began about 5,000 years ago with a circular ditch and bank, and the great stones were raised and rearranged in stages over many centuries. The smaller stones, known as bluestones, came from the Preseli Hills in west Wales, roughly 150 miles away. Exactly how people moved them so far is still debated.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Stonehenge was not built all at once: work began about 5,000 years ago and went on in stages over centuries.',
          sourceSpans: [
            'Work began about 5,000 years ago',
            'was not built all at once',
            'in stages over many centuries',
          ],
          qualifiers: ['about', 'not'],
          relation: 'sequence',
          topic: 'how long it took to build',
          semanticCue: 'Think of many generations working over a very long time.',
          clozeAnswers: ['5,000 years ago'],
        },
        {
          id: 's1-i2',
          text: 'The smaller bluestones came from the Preseli Hills in Wales, roughly 150 miles away.',
          sourceSpans: [
            'The smaller stones, known as bluestones, came from the Preseli Hills in west Wales, roughly 150 miles away',
          ],
          qualifiers: ['roughly'],
          relation: 'fact',
          topic: 'where the smaller stones came from',
          semanticCue: 'Think of hills in another country, a long journey to the west.',
          clozeAnswers: ['Preseli Hills', 'Wales'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What does the passage say about how Stonehenge was built?',
        options: [
          'It was built in stages over many centuries',
          'It was finished in a single summer',
          'It was built about 500 years ago',
        ],
        answerIndex: 0,
        explanationSpan:
          'the great stones were raised and rearranged in stages over many centuries',
      },
    },
  ],
};

export default passage;
