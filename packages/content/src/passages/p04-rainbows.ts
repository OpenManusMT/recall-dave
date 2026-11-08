import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p04-rainbows',
  title: 'How a rainbow forms',
  subject: 'science',
  summary: 'Why you need the sun behind you, and how raindrops split sunlight into colours.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Standard optics: the primary rainbow comes from refraction into a raindrop, one internal reflection and refraction out; dispersion separates the colours; red is outermost in the primary bow. A secondary bow from two internal reflections is fainter with the colour order reversed. The bow is centred opposite the sun at about 42 degrees, so it is seen with the sun behind the observer and low in the sky. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'To see a rainbow, you need sunshine and rain at the same time. The sun has to be behind you, and the falling rain has to be in front of you. Rainbows are often seen on showery days in the early morning or late afternoon. At those times the sun is low in the sky, so the bow sits high enough above the ground to be visible.',
      ideas: [
        {
          id: 's1-i1',
          text: 'To see a rainbow, the sun must be behind you and the rain in front of you.',
          sourceSpans: [
            'The sun has to be behind you, and the falling rain has to be in front of you',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'where to stand',
          semanticCue: 'Think about where the sun is compared with the direction you are looking.',
          clozeAnswers: ['behind you', 'in front of you'],
        },
        {
          id: 's1-i2',
          text: 'Rainbows are often seen early or late in the day, when the low sun lets the bow sit high enough to see.',
          sourceSpans: [
            'Rainbows are often seen on showery days in the early morning or late afternoon',
            'the sun is low in the sky, so the bow sits high enough above the ground to be visible',
          ],
          qualifiers: ['often'],
          relation: 'cause_effect',
          topic: 'the best times of day',
          semanticCue: 'Think about the height of the sun at the start and the end of the day.',
          clozeAnswers: ['early morning', 'late afternoon'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why are rainbows often seen in the early morning or late afternoon?',
        options: [
          'The air is wetter at those times',
          'The sun is low, so the bow sits high enough to be seen',
          'Rain mostly falls at those times',
        ],
        answerIndex: 1,
        explanationSpan:
          'At those times the sun is low in the sky, so the bow sits high enough above the ground to be visible.',
      },
    },
    {
      id: 's2',
      text: 'Sunlight looks white, but it is really a mixture of colours. When a ray of sunlight enters a raindrop, it bends. It then reflects off the back of the drop and bends again as it comes out. Each colour bends by a slightly different amount, so the white light is split and the colours fan out. Millions of drops together build up the curved band that we see.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Light bends as it enters a raindrop, reflects off the back, and bends again on the way out.',
          sourceSpans: [
            'When a ray of sunlight enters a raindrop, it bends',
            'It then reflects off the back of the drop and bends again as it comes out',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'the path of light through a drop',
          semanticCue: 'Follow the light in, to the back of the drop, and out again.',
          clozeAnswers: ['bends'],
        },
        {
          id: 's2-i2',
          text: 'Each colour bends a slightly different amount, so white sunlight splits into separate colours.',
          sourceSpans: [
            'Each colour bends by a slightly different amount, so the white light is split and the colours fan out',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why the colours separate',
          semanticCue:
            'Think about what is hidden inside white light, and how the drop treats each part.',
          clozeAnswers: ['slightly different amount'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why does white sunlight split into colours in a raindrop?',
        options: [
          'Each colour bends by a slightly different amount',
          'The raindrop already has colours inside it',
          'The clouds tint the light as it passes',
        ],
        answerIndex: 0,
        explanationSpan:
          'Each colour bends by a slightly different amount, so the white light is split and the colours fan out.',
      },
    },
    {
      id: 's3',
      text: 'In the main rainbow, red is always on the outside of the curve and violet is on the inside, with the other colours in between. Sometimes a second, fainter bow appears outside the first. Its light has reflected twice inside each drop, and this turns the order round, so in the second bow red is on the inside.',
      ideas: [
        {
          id: 's3-i1',
          text: 'In the main bow, red is on the outside of the curve and violet is on the inside.',
          sourceSpans: ['red is always on the outside of the curve and violet is on the inside'],
          qualifiers: [],
          relation: 'fact',
          topic: 'the order of the colours',
          semanticCue: 'Picture the top edge of the arch. Which warm colour sits there?',
          clozeAnswers: ['red', 'outside'],
        },
        {
          id: 's3-i2',
          text: 'A fainter second bow sometimes appears outside the first, with its colours in reverse order.',
          sourceSpans: [
            'Sometimes a second, fainter bow appears outside the first',
            'this turns the order round, so in the second bow red is on the inside',
          ],
          qualifiers: ['sometimes'],
          relation: 'comparison',
          topic: 'the second bow',
          semanticCue: 'Think of a mirror image of the main bow.',
          clozeAnswers: ['second, fainter bow'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'How does a second rainbow differ from the main one?',
        options: [
          'It is brighter and lower down',
          'It appears on the other side of the sky',
          'It is fainter and its colours are in reverse order',
        ],
        answerIndex: 2,
        explanationSpan:
          'Sometimes a second, fainter bow appears outside the first. Its light has reflected twice inside each drop, and this turns the order round, so in the second bow red is on the inside.',
      },
    },
  ],
};

export default passage;
