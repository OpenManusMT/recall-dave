import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p14-spring-bulbs',
  title: 'Planting spring bulbs',
  subject: 'home',
  summary: 'When to plant daffodils, how deep to put them, and what to do after they flower.',
  density: 'light',
  kind: 'library',
  factNotes:
    "RHS guidance: plant daffodils and most spring bulbs in early autumn (September to October); tulips later, usually November; plant at about two to three times the bulb's own height deep; pointed tip upwards, roots from the flat base; leave the foliage for about six weeks after flowering so the bulb can store food for next year. High confidence.",
  sections: [
    {
      id: 's1',
      text: 'Bulbs such as daffodils flower in spring, but they need to be planted in autumn. Through the autumn and winter, they grow roots in the cool, damp soil, ready to send up leaves and flowers when the weather warms. Daffodils do best when planted in early autumn, ideally in September or October. Tulips are usually planted a little later, in November.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Spring bulbs such as daffodils are planted in autumn, and grow roots through the autumn and winter.',
          sourceSpans: [
            'they need to be planted in autumn',
            'Through the autumn and winter, they grow roots in the cool, damp soil',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'when to plant',
          semanticCue: 'Think about the season before the flowers appear.',
          clozeAnswers: ['autumn'],
        },
        {
          id: 's1-i2',
          text: 'Daffodils do best planted in September or October, and tulips are usually planted later, in November.',
          sourceSpans: [
            'Daffodils do best when planted in early autumn, ideally in September or October',
            'Tulips are usually planted a little later, in November',
          ],
          qualifiers: ['usually'],
          relation: 'comparison',
          topic: 'daffodils compared with tulips',
          semanticCue: 'One goes in near the start of autumn, the other towards its end.',
          clozeAnswers: ['September or October'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why are spring bulbs planted in autumn?',
        options: [
          'So the frost can kill any pests on them',
          'Because they would rot if kept until spring',
          'So they can grow roots before the flowers come up',
        ],
        answerIndex: 2,
        explanationSpan:
          'Through the autumn and winter, they grow roots in the cool, damp soil, ready to send up leaves and flowers when the weather warms.',
      },
    },
    {
      id: 's2',
      text: 'A good guide is to plant a bulb at a depth of about two to three times its own height. So a bulb five centimetres tall goes in a hole ten to fifteen centimetres deep. Put each bulb in with its pointed end facing up, because that is where the shoot grows from. The roots grow from the flat base underneath.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Plant a bulb about two to three times its own height deep.',
          sourceSpans: ['plant a bulb at a depth of about two to three times its own height'],
          qualifiers: ['about'],
          relation: 'fact',
          topic: 'how deep to plant',
          semanticCue: 'Measure the bulb in your mind, then multiply.',
          clozeAnswers: ['two to three times'],
        },
        {
          id: 's2-i2',
          text: 'Put the bulb in pointed end up, as the shoot grows from there and the roots grow from the flat base.',
          sourceSpans: [
            'Put each bulb in with its pointed end facing up, because that is where the shoot grows from',
            'The roots grow from the flat base underneath',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'which way up',
          semanticCue: 'Think about which part of the bulb the green shoot comes out of.',
          clozeAnswers: ['pointed end'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'How deep should a bulb five centimetres tall be planted?',
        options: ['Two or three centimetres', 'Ten to fifteen centimetres', 'Fifty centimetres'],
        answerIndex: 1,
        explanationSpan:
          'So a bulb five centimetres tall goes in a hole ten to fifteen centimetres deep.',
      },
    },
    {
      id: 's3',
      text: "After the flowers fade, it is tempting to tidy up the leaves straight away. It is better to leave them for about six weeks. During that time the leaves keep using sunlight to make food, which is stored in the bulb for next year's flowers. Once the leaves turn yellow and begin to die back, they can be cut off.",
      ideas: [
        {
          id: 's3-i1',
          text: 'After flowering, leave the leaves for about six weeks before cutting them back.',
          sourceSpans: [
            'It is better to leave them for about six weeks',
            'Once the leaves turn yellow and begin to die back, they can be cut off',
          ],
          qualifiers: ['about'],
          relation: 'sequence',
          topic: 'what to do after flowering',
          semanticCue: 'Think about resisting the urge to tidy up straight away.',
          clozeAnswers: ['six weeks'],
        },
        {
          id: 's3-i2',
          text: "The leaves use sunlight to make food, which is stored in the bulb for next year's flowers.",
          sourceSpans: [
            "the leaves keep using sunlight to make food, which is stored in the bulb for next year's flowers",
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why the leaves matter',
          semanticCue: 'Think about what the green leaves are doing for next spring.',
          clozeAnswers: ['make food', 'stored in the bulb'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why should you leave daffodil leaves for a while after the flowers fade?',
        options: [
          'They protect the bulb from frost',
          'They keep slugs away from the bulb',
          "They make food that is stored for next year's flowers",
        ],
        answerIndex: 2,
        explanationSpan:
          "the leaves keep using sunlight to make food, which is stored in the bulb for next year's flowers",
      },
    },
  ],
};

export default passage;
