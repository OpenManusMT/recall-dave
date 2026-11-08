import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-01-autumn-leaves',
  title: 'Why leaves change colour',
  subject: 'nature',
  summary: 'What happens inside a leaf as it turns from green to yellow, orange or red.',
  density: 'medium',
  kind: 'probe',
  factNotes:
    'Chlorophyll production stops and the existing chlorophyll breaks down in autumn, revealing yellow and orange carotenoid pigments already present in the leaf; some species, such as many maples, produce red anthocyanin pigments in autumn. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Leaves are green because they contain chlorophyll, which plants use to make food from sunlight. In autumn, as the days grow shorter and cooler, trees stop making new chlorophyll, and the green colour breaks down. This reveals yellow and orange colours that were in the leaf all along, hidden by the green. Some trees, such as maples, also make new red colours in their leaves in autumn.',
      ideas: [
        {
          id: 's1-i1',
          text: 'In autumn the green chlorophyll breaks down, revealing yellow and orange colours already in the leaf.',
          sourceSpans: [
            'trees stop making new chlorophyll, and the green colour breaks down',
            'This reveals yellow and orange colours that were in the leaf all along',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'where the yellow and orange come from',
          semanticCue: 'Think about colours that were hiding under the green all summer.',
          clozeAnswers: ['chlorophyll', 'breaks down'],
        },
        {
          id: 's1-i2',
          text: 'Some trees, such as maples, also make new red colours in autumn.',
          sourceSpans: [
            'Some trees, such as maples, also make new red colours in their leaves in autumn',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'where the red comes from',
          semanticCue: 'Think about whether the red was there all along, like the yellow.',
          clozeAnswers: ['red colours'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why do many leaves turn yellow in autumn?',
        options: [
          'The leaves soak up yellow colour from the soil',
          'The green breaks down, revealing yellow that was there all along',
          'Frost turns the green into yellow',
        ],
        answerIndex: 1,
        explanationSpan:
          'This reveals yellow and orange colours that were in the leaf all along, hidden by the green.',
      },
    },
  ],
};

export default passage;
