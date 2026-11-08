import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p12-swallows',
  title: 'The journey of the swallow',
  subject: 'nature',
  summary: "Where Britain's swallows spend the winter, and how they feed on the wing.",
  density: 'light',
  kind: 'library',
  factNotes:
    'RSPB and BTO: swallows that breed in Britain spend the winter in southern Africa (mainly South Africa), crossing Europe and the Sahara; they leave in early autumn and return in spring; they feed almost entirely on flying insects caught on the wing, often low over fields and water, and drink by skimming water; many return to the same area and often the same building to nest in a mud cup. Exact distances and arrival months left out. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Swallows spend the summer in Britain, but they do not stay for the winter. In early autumn, they gather on wires and rooftops and then set off south. They fly thousands of miles, across Europe and the Sahara Desert, to spend the winter in southern Africa, where there are plenty of flying insects to eat. In spring, they make the long journey back.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Swallows fly thousands of miles to spend the winter in southern Africa.',
          sourceSpans: [
            'They fly thousands of miles, across Europe and the Sahara Desert, to spend the winter in southern Africa',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'where swallows go in winter',
          semanticCue: 'Think of a continent far to the south, beyond a great desert.',
          clozeAnswers: ['southern Africa'],
        },
        {
          id: 's1-i2',
          text: 'They go there because there are plenty of flying insects to eat, and they return in spring.',
          sourceSpans: [
            'where there are plenty of flying insects to eat',
            'In spring, they make the long journey back',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why they go, and when they return',
          semanticCue: 'Think about what a swallow eats, and which season brings it home.',
          clozeAnswers: ['flying insects'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why do swallows spend the winter in southern Africa?',
        options: [
          'There are plenty of flying insects to eat there',
          'They raise their chicks there in winter',
          'British winters are too windy for flying',
        ],
        answerIndex: 0,
        explanationSpan:
          'to spend the winter in southern Africa, where there are plenty of flying insects to eat',
      },
    },
    {
      id: 's2',
      text: 'Swallows feed almost entirely on insects, which they catch while flying. They swoop low over fields, ponds and rivers, snapping up flies and other small insects in mid-air. They even drink by skimming the surface of the water. When they arrive back in spring, many return to the same area, and often to the same barn or shed, to build a nest of mud and straw.',
      ideas: [
        {
          id: 's2-i1',
          text: "Almost all of a swallow's food is insects caught in flight, as it swoops low over fields and water.",
          sourceSpans: [
            'Swallows feed almost entirely on insects, which they catch while flying',
            'They swoop low over fields, ponds and rivers',
          ],
          qualifiers: ['almost'],
          relation: 'fact',
          topic: 'what and how swallows eat',
          semanticCue: 'Think about where a swallow is when it has its meals.',
          clozeAnswers: ['insects', 'while flying'],
        },
        {
          id: 's2-i2',
          text: 'In spring, many return to the same area, often to the same barn or shed, to nest.',
          sourceSpans: [
            'many return to the same area, and often to the same barn or shed, to build a nest of mud and straw',
          ],
          qualifiers: ['often'],
          relation: 'fact',
          topic: 'where they nest when they return',
          semanticCue: 'Think about whether they choose a brand new place each year.',
          clozeAnswers: ['same barn or shed'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'How do swallows catch their food?',
        options: [
          'By searching the ground for seeds',
          'By snapping up insects while flying',
          'By diving under the water for fish',
        ],
        answerIndex: 1,
        explanationSpan: 'snapping up flies and other small insects in mid-air',
      },
    },
  ],
};

export default passage;
