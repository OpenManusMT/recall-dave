import type { AuthoredPassage } from '../../src';

/** A small self-contained passage used by core tests (independent of bundled content). */
export const TEST_PASSAGE: AuthoredPassage = {
  id: 'p99-test-kettles',
  title: 'Test passage about kettles',
  subject: 'home',
  summary: 'Test fixture.',
  density: 'medium',
  kind: 'library',
  factNotes: 'Fixture for unit tests.',
  sections: [
    {
      id: 's1',
      text: 'Hard water contains dissolved minerals such as calcium. When it is boiled, some of these minerals are left behind as a chalky layer called limescale. Over time the layer builds up on the element and makes the kettle less efficient, so it usually takes longer to boil.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Boiling hard water leaves minerals behind as a chalky layer called limescale.',
          sourceSpans: [
            'some of these minerals are left behind as a chalky layer called limescale',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what boiling hard water leaves behind',
          semanticCue: 'Think about the chalky layer inside an old kettle.',
          clozeAnswers: ['limescale'],
        },
        {
          id: 's1-i2',
          text: 'Limescale makes the kettle less efficient, so it usually takes longer to boil.',
          sourceSpans: ['makes the kettle less efficient, so it usually takes longer to boil'],
          qualifiers: ['usually'],
          relation: 'cause_effect',
          topic: 'what the layer does to the kettle',
          semanticCue: 'Think about waiting for the kettle.',
          clozeAnswers: ['less efficient'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why does limescale matter?',
        options: [
          'It changes the colour of tea',
          'It makes the kettle slower to boil',
          'It makes water softer',
        ],
        answerIndex: 1,
        explanationSpan: 'makes the kettle less efficient, so it usually takes longer to boil',
      },
    },
    {
      id: 's2',
      text: 'A mild acid dissolves limescale. Fill the kettle halfway with water and a few spoonfuls of citric acid, boil it, then leave it to stand for an hour. Pour it away, rinse well, and boil a full kettle of fresh water before making a drink.',
      ideas: [
        {
          id: 's2-i1',
          text: 'A mild acid such as citric acid dissolves limescale.',
          sourceSpans: ['A mild acid dissolves limescale.', 'a few spoonfuls of citric acid'],
          qualifiers: [],
          relation: 'fact',
          topic: 'what removes the layer',
          semanticCue: 'Think of something sour that you can buy for cleaning.',
          clozeAnswers: ['mild acid'],
        },
        {
          id: 's2-i2',
          text: 'Afterwards, rinse the kettle and boil fresh water before making a drink.',
          sourceSpans: ['rinse well, and boil a full kettle of fresh water before making a drink'],
          qualifiers: [],
          relation: 'sequence',
          topic: 'what to do at the end',
          semanticCue: 'Think about making sure the next cup of tea tastes normal.',
          clozeAnswers: ['rinse well', 'fresh water'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What should you do before making a drink?',
        options: [
          'Boil a kettle of fresh water',
          'Add more citric acid',
          'Leave the kettle empty overnight',
        ],
        answerIndex: 0,
        explanationSpan: 'boil a full kettle of fresh water before making a drink',
      },
    },
    {
      id: 's3',
      text: 'Descaling every month or two is usually enough in a hard-water area. Some people also use a water filter jug, which removes part of the calcium before the water reaches the kettle and so slows the build-up.',
      ideas: [
        {
          id: 's3-i1',
          text: 'In hard-water areas, descaling every month or two is usually enough.',
          sourceSpans: ['Descaling every month or two is usually enough in a hard-water area.'],
          qualifiers: ['usually'],
          relation: 'fact',
          topic: 'how often to do it',
          semanticCue: 'Think about a calendar.',
          clozeAnswers: ['month or two'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'What does a water filter jug do?',
        options: ['Heats the water', 'Adds minerals', 'Removes part of the calcium'],
        answerIndex: 2,
        explanationSpan: 'removes part of the calcium before the water reaches the kettle',
      },
    },
  ],
};
