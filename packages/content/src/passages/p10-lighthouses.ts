import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p10-lighthouses',
  title: 'How lighthouses guide sailors',
  subject: 'travel',
  summary: 'How each lighthouse can be recognised at night, and how they are run today.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Each lighthouse has a distinct light "character" (number and timing of flashes, sometimes colour) shown on charts and in lists of lights, so navigators can identify it and fix their position. Trinity House (England, Wales and the Channel Islands) completed automation when its last keepers left North Foreland, Kent, in November 1998; British lighthouses are now automatic and monitored remotely. The flash pattern given is an illustration, not a real light. High confidence.',
  sections: [
    {
      id: 's1',
      text: "For centuries, lighthouses have warned ships of rocks, sandbanks and dangerous headlands. They also help sailors to work out where they are. On a dark night, a ship's crew may see several lights along a coast at once, so they need some way of telling one lighthouse from another. Once they know which light they are looking at, they can find their position on a chart.",
      ideas: [
        {
          id: 's1-i1',
          text: 'Lighthouses warn ships of dangers such as rocks and sandbanks, and help sailors work out where they are.',
          sourceSpans: [
            'lighthouses have warned ships of rocks, sandbanks and dangerous headlands',
            'They also help sailors to work out where they are',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what lighthouses are for',
          semanticCue:
            'There are two jobs: one is about danger, the other is about finding the way.',
          clozeAnswers: ['rocks, sandbanks'],
        },
        {
          id: 's1-i2',
          text: 'Sailors may see several lights at once, so they need a way to tell one lighthouse from another.',
          sourceSpans: [
            "a ship's crew may see several lights along a coast at once, so they need some way of telling one lighthouse from another",
          ],
          qualifiers: ['may'],
          relation: 'cause_effect',
          topic: 'the problem at night',
          semanticCue: 'Imagine a dark coastline with more than one light shining.',
          clozeAnswers: ['several lights'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why do sailors need to know which lighthouse they are looking at?',
        options: [
          'So they can find their position on a chart',
          'So they know whether a keeper is on duty',
          'So they can tell how deep the water is',
        ],
        answerIndex: 0,
        explanationSpan:
          'Once they know which light they are looking at, they can find their position on a chart.',
      },
    },
    {
      id: 's2',
      text: "The answer is that each lighthouse has its own pattern of light. One may give two quick flashes every ten seconds, while its neighbour shows a single long flash, and some use coloured light as well. These patterns are printed on sailors' charts. By timing the flashes with a watch, a navigator can tell exactly which lighthouse is in view.",
      ideas: [
        {
          id: 's2-i1',
          text: "Each lighthouse has its own pattern of flashes, and these patterns are printed on sailors' charts.",
          sourceSpans: [
            'each lighthouse has its own pattern of light',
            "These patterns are printed on sailors' charts",
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what makes each light different',
          semanticCue: 'Think of a signal that works like a signature, written down on the map.',
          clozeAnswers: ['own pattern'],
        },
        {
          id: 's2-i2',
          text: 'By timing the flashes, a navigator can tell which lighthouse is in view.',
          sourceSpans: [
            'By timing the flashes with a watch, a navigator can tell exactly which lighthouse is in view',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how sailors identify a light',
          semanticCue:
            'Think about what a sailor would do with a watch while looking at the light.',
          clozeAnswers: ['timing the flashes'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'How can a navigator tell which lighthouse they can see?',
        options: [
          'By the height of the tower',
          'By timing its pattern of flashes',
          'By the sound of its foghorn',
        ],
        answerIndex: 1,
        explanationSpan:
          'By timing the flashes with a watch, a navigator can tell exactly which lighthouse is in view.',
      },
    },
    {
      id: 's3',
      text: "For a long time, keepers lived at lighthouses to keep the lamps lit and the machinery working, often in remote and lonely places. Over the twentieth century the lights were gradually automated. In 1998, the last keepers working for Trinity House, which looks after lighthouses in England and Wales, left North Foreland lighthouse in Kent. Today Britain's lighthouses work automatically and are watched over from a distance.",
      ideas: [
        {
          id: 's3-i1',
          text: 'Keepers once lived at lighthouses to keep the lamps lit and the machinery working.',
          sourceSpans: [
            'keepers lived at lighthouses to keep the lamps lit and the machinery working',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'who used to run lighthouses',
          semanticCue: 'Think of the people who lived out on the rocks and headlands.',
          clozeAnswers: ['keepers'],
        },
        {
          id: 's3-i2',
          text: 'The lights were gradually automated, and the last Trinity House keepers left in 1998.',
          sourceSpans: [
            'In 1998, the last keepers working for Trinity House',
            'the lights were gradually automated',
            'left North Foreland lighthouse in Kent',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'what changed in the last century',
          semanticCue:
            'Think about machines taking over, and the year near the end of the century when people left.',
          clozeAnswers: ['1998'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why are keepers no longer needed at British lighthouses?',
        options: [
          'Ships no longer need lighthouses',
          'The towers have all been closed',
          'The lights now work automatically',
        ],
        answerIndex: 2,
        explanationSpan:
          "Today Britain's lighthouses work automatically and are watched over from a distance.",
      },
    },
  ],
};

export default passage;
