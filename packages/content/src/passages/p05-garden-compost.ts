import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p05-garden-compost',
  title: 'Making garden compost',
  subject: 'home',
  summary: 'What to put in a compost heap, why turning it helps, and how long it takes.',
  density: 'light',
  kind: 'library',
  factNotes:
    'RHS and general gardening guidance: mix nitrogen-rich "greens" and carbon-rich "browns"; too many greens gives a wet, smelly heap, too many browns slows decay; adding browns helps a smelly heap; turning adds air for the organisms that break material down; compost typically takes from several months to a year or more (hedged with "usually" and "sometimes"). Did not give exact ratios, which vary between sources. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'A compost heap turns garden and kitchen waste into a rich, crumbly material that feeds the soil. Gardeners sort the ingredients into two kinds. "Greens" are soft, moist things such as vegetable peelings, fruit scraps and grass cuttings. "Browns" are drier things such as cardboard, scrunched-up paper, dead leaves and woody stems. A good heap needs a mixture of both.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Greens are soft, moist waste such as peelings and grass cuttings; browns are drier, such as cardboard and dead leaves.',
          sourceSpans: [
            '"Greens" are soft, moist things such as vegetable peelings, fruit scraps and grass cuttings',
            '"Browns" are drier things such as cardboard, scrunched-up paper, dead leaves and woody stems',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'the two kinds of ingredient',
          semanticCue: 'One kind is wet and fresh, the other is dry. Think of an example of each.',
          clozeAnswers: ['soft, moist', 'grass cuttings'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Which of these would count as a "brown" for the compost heap?',
        options: ['Grass cuttings', 'Dead leaves', 'Fruit scraps'],
        answerIndex: 1,
        explanationSpan:
          '"Browns" are drier things such as cardboard, scrunched-up paper, dead leaves and woody stems.',
      },
    },
    {
      id: 's2',
      text: 'Getting the balance right matters. If a heap has too many greens, it becomes wet, slimy and smelly. If it has too many browns, it stays dry and rots very slowly. A heap that smells bad can usually be put right by mixing in more browns, such as torn cardboard. Many gardeners simply add a layer of browns each time they add a bucket of kitchen scraps.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Too many greens make a heap wet and smelly; too many browns make it dry and slow to rot.',
          sourceSpans: [
            'If a heap has too many greens, it becomes wet, slimy and smelly',
            'If it has too many browns, it stays dry and rots very slowly',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'getting the mix wrong',
          semanticCue: 'Think about too much of the wet kind, and then too much of the dry kind.',
          clozeAnswers: ['wet, slimy and smelly'],
        },
        {
          id: 's2-i2',
          text: 'A smelly heap can usually be fixed by mixing in more browns.',
          sourceSpans: ['A heap that smells bad can usually be put right by mixing in more browns'],
          qualifiers: ['usually'],
          relation: 'cause_effect',
          topic: 'fixing a smelly heap',
          semanticCue: 'Which kind of ingredient would soak up the extra wetness?',
          clozeAnswers: ['more browns'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What is likely to happen to a heap with too many greens?',
        options: [
          'It dries out and rots slowly',
          'It turns into compost more quickly',
          'It becomes wet, slimy and smelly',
        ],
        answerIndex: 2,
        explanationSpan: 'If a heap has too many greens, it becomes wet, slimy and smelly.',
      },
    },
    {
      id: 's3',
      text: 'Compost is made by worms, fungi and tiny living things that break the waste down, and they work best with plenty of air. Turning the heap with a garden fork every few weeks mixes in fresh air and speeds things up. Even so, compost takes time. It is usually ready after several months, and sometimes takes a year or more. Finished compost is dark and crumbly and smells like a woodland floor.',
      ideas: [
        {
          id: 's3-i1',
          text: 'Turning the heap mixes in air, which helps the creatures that break the waste down and speeds things up.',
          sourceSpans: [
            'Turning the heap with a garden fork every few weeks mixes in fresh air and speeds things up',
            'they work best with plenty of air',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why turning the heap helps',
          semanticCue: 'Think about what the fork lets into the middle of the heap.',
          clozeAnswers: ['fresh air', 'speeds things up'],
        },
        {
          id: 's3-i2',
          text: 'Compost is usually ready after several months, and can take a year or more.',
          sourceSpans: [
            'It is usually ready after several months, and sometimes takes a year or more',
          ],
          qualifiers: ['usually', 'sometimes'],
          relation: 'fact',
          topic: 'how long it takes',
          semanticCue: 'Think in seasons, not in days or weeks.',
          clozeAnswers: ['several months'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why does turning a compost heap help?',
        options: [
          'It adds air, which speeds up the rotting',
          'It keeps the heap warm in winter',
          'It stops worms from getting in',
        ],
        answerIndex: 0,
        explanationSpan:
          'Turning the heap with a garden fork every few weeks mixes in fresh air and speeds things up.',
      },
    },
  ],
};

export default passage;
