import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-06-bicycle-gears',
  title: 'How bicycle gears help',
  subject: 'practical',
  summary: 'Why low gears help on hills and high gears suit speed on the flat.',
  density: 'light',
  kind: 'probe',
  factNotes:
    'Basic bicycle gearing: a low gear needs less force per pedal stroke but moves the bike a shorter distance for each turn of the pedals; a high gear needs more force but covers more distance per turn, suiting speed on level roads. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Gears let a cyclist choose between easy pedalling and covering more ground with each turn of the pedals. In a low gear, the pedals turn easily, which helps when climbing a hill, but the bike moves only a short distance for each turn. In a high gear, pedalling is harder work, but each turn carries the bike much further, so high gears suit speed on flat roads.',
      ideas: [
        {
          id: 's1-i1',
          text: 'A low gear makes pedalling easier on hills, but the bike moves only a short way with each turn.',
          sourceSpans: [
            'In a low gear, the pedals turn easily, which helps when climbing a hill, but the bike moves only a short distance for each turn',
          ],
          qualifiers: ['only'],
          relation: 'comparison',
          topic: 'low gears',
          semanticCue: 'Think about what you would choose for a steep climb, and what you give up.',
          clozeAnswers: ['pedals turn easily', 'short distance'],
        },
        {
          id: 's1-i2',
          text: 'A high gear is harder to push but takes the bike further with each turn, which suits speed on the flat.',
          sourceSpans: [
            'In a high gear, pedalling is harder work, but each turn carries the bike much further',
            'high gears suit speed on flat roads',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'high gears',
          semanticCue: 'Think about riding fast along a level road.',
          clozeAnswers: ['harder work', 'much further'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why would a cyclist change to a low gear for a steep hill?',
        options: [
          'To go faster up the hill',
          'To make the pedals easier to turn',
          'To cover more ground with each turn',
        ],
        answerIndex: 1,
        explanationSpan: 'In a low gear, the pedals turn easily, which helps when climbing a hill',
      },
    },
  ],
};

export default passage;
