import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p16-recycling-glass',
  title: 'Recycling glass',
  subject: 'practical',
  summary: 'Why glass is so easy to recycle, and how to get bottles and jars ready.',
  density: 'light',
  kind: 'library',
  factNotes:
    'Glass containers can be melted and remade repeatedly without loss of quality (British Glass, WRAP). Using recycled glass (cullet) lowers the melting temperature and saves energy. Councils ask for rinsed containers with lids removed; whether metal lids go with cans varies by council, so the text says to check. Glass is often separated by colour (clear, green, brown) because coloured glass cannot be made into clear glass. Drinking glasses, ovenproof dishes and window glass melt differently and are usually not accepted with bottles. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Glass bottles and jars are one of the easiest things to recycle. They can be melted down and made into new bottles and jars again and again, without the glass losing any of its quality. Using old glass also saves energy, because broken glass melts at a lower temperature than the sand and other raw materials used to make new glass.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Glass can be recycled into new bottles and jars over and over without losing quality.',
          sourceSpans: [
            'They can be melted down and made into new bottles and jars again and again, without the glass losing any of its quality',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'how often glass can be recycled',
          semanticCue: 'Think about whether the glass wears out each time it is used again.',
          clozeAnswers: ['again and again'],
        },
        {
          id: 's1-i2',
          text: 'Recycling glass saves energy, because old glass melts at a lower temperature than the raw materials.',
          sourceSpans: [
            'Using old glass also saves energy, because broken glass melts at a lower temperature than the sand and other raw materials',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'a further benefit of using old glass',
          semanticCue: 'Compare melting old glass with starting again from sand.',
          clozeAnswers: ['saves energy', 'lower temperature'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why does using old glass save energy?',
        options: [
          'It does not need to be washed',
          'It melts at a lower temperature than the raw materials',
          'It is lighter to carry to the factory',
        ],
        answerIndex: 1,
        explanationSpan:
          'Using old glass also saves energy, because broken glass melts at a lower temperature than the sand and other raw materials used to make new glass.',
      },
    },
    {
      id: 's2',
      text: 'Before you put glass out for collection, give each bottle or jar a quick rinse to remove leftover food and drink. Then take off the lids and tops, because these are made of different materials and need to be recycled separately. Metal lids can often go in with your cans, but councils vary, so it is worth checking your local rules.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Before recycling, rinse bottles and jars and take off the lids, which are made of different materials.',
          sourceSpans: [
            'give each bottle or jar a quick rinse to remove leftover food and drink',
            'take off the lids and tops, because these are made of different materials',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'getting glass ready',
          semanticCue: 'Think about two quick jobs at the kitchen sink before the glass goes out.',
          clozeAnswers: ['quick rinse'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why should you take the lids off glass jars before recycling them?',
        options: [
          'They make the jars too heavy to lift',
          'They are worth money on their own',
          'They are made of different materials',
        ],
        answerIndex: 2,
        explanationSpan:
          'take off the lids and tops, because these are made of different materials and need to be recycled separately',
      },
    },
    {
      id: 's3',
      text: 'In many areas, glass is collected or sorted by colour: clear, green and brown. This is because coloured glass cannot be turned back into clear glass, so the colours are kept apart to make new bottles of the same kind. Not all glass belongs with bottles and jars, though. Drinking glasses, ovenproof dishes and window glass melt differently and are usually not accepted.',
      ideas: [
        {
          id: 's3-i1',
          text: 'In many areas glass is sorted by colour, because coloured glass cannot be made back into clear glass.',
          sourceSpans: [
            'glass is collected or sorted by colour: clear, green and brown',
            'coloured glass cannot be turned back into clear glass',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why colours are kept apart',
          semanticCue: 'Think about whether green glass could ever become a clear jar.',
          clozeAnswers: ['by colour'],
        },
        {
          id: 's3-i2',
          text: 'Drinking glasses, oven dishes and window glass melt differently, so they are usually not accepted with bottles.',
          sourceSpans: [
            'Drinking glasses, ovenproof dishes and window glass melt differently and are usually not accepted',
            'Not all glass belongs with bottles and jars',
          ],
          qualifiers: ['usually', 'not'],
          relation: 'rule_exception',
          topic: 'glass that does not belong',
          semanticCue: 'Think of glass items in the kitchen cupboard or in a window frame.',
          clozeAnswers: ['Drinking glasses', 'window glass'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why is glass often kept apart by colour?',
        options: [
          'Coloured glass cannot be made back into clear glass',
          'Clear glass is much heavier than coloured glass',
          'Brown glass cannot be recycled at all',
        ],
        answerIndex: 0,
        explanationSpan:
          'This is because coloured glass cannot be turned back into clear glass, so the colours are kept apart to make new bottles of the same kind.',
      },
    },
  ],
};

export default passage;
