import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p06-tides',
  title: 'Why the sea has tides',
  subject: 'science',
  summary: 'How the Moon and Sun pull on the oceans, and why high tide comes later each day.',
  density: 'dense',
  kind: 'library',
  factNotes:
    "Standard physics of tides: the Moon's gravity raises bulges on the near and far sides of the Earth; the Earth's rotation gives two high and two low tides in roughly 24 hours 50 minutes on most coasts, including Britain's (some coasts elsewhere have one tide a day, hence \"most\"); high tide about 50 minutes later each day; spring tides near new and full moon when Sun, Moon and Earth align; neap tides near the half (quarter) moons. High confidence.",
  sections: [
    {
      id: 's1',
      text: 'The tides are caused mainly by the Moon. Its gravity pulls on the whole Earth, but it pulls a little more strongly on the ocean nearest to it, so the water there heaps up into a slight bulge. At the same time, a second bulge forms on the opposite side of the Earth, facing away from the Moon. Between the two bulges, the water is lower.',
      ideas: [
        {
          id: 's1-i1',
          text: "The Moon's gravity pulls more strongly on the nearest ocean, so the water there heaps up into a bulge.",
          sourceSpans: [
            'Its gravity pulls on the whole Earth, but it pulls a little more strongly on the ocean nearest to it, so the water there heaps up into a slight bulge',
            'The tides are caused mainly by the Moon',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what the Moon does to the sea',
          semanticCue: 'Think about the ocean on the side of the Earth closest to the Moon.',
          clozeAnswers: ['more strongly', 'bulge'],
        },
        {
          id: 's1-i2',
          text: 'A second bulge forms on the far side of the Earth, facing away from the Moon.',
          sourceSpans: [
            'a second bulge forms on the opposite side of the Earth, facing away from the Moon',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'the other side of the Earth',
          semanticCue: 'There is more than one bulge. Think about the side you might least expect.',
          clozeAnswers: ['opposite side'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Where do the two bulges of water form?',
        options: [
          'At the North and South Poles',
          'On the side facing the Moon and on the opposite side',
          'In the deepest parts of the oceans',
        ],
        answerIndex: 1,
        explanationSpan:
          'so the water there heaps up into a slight bulge. At the same time, a second bulge forms on the opposite side of the Earth, facing away from the Moon',
      },
    },
    {
      id: 's2',
      text: "As the Earth turns once a day, each stretch of coast is carried through both bulges and both low areas in between. That is why most coasts, including Britain's, have roughly two high tides and two low tides a day. At high tide the water comes furthest up the beach, and at low tide it is furthest out, with the sea rising or falling gradually in the hours between.",
      ideas: [
        {
          id: 's2-i1',
          text: 'As the Earth turns, each coast passes through both bulges, giving most coasts roughly two high and two low tides a day.',
          sourceSpans: [
            "most coasts, including Britain's, have roughly two high tides and two low tides a day",
            'each stretch of coast is carried through both bulges',
          ],
          qualifiers: ['most', 'roughly'],
          relation: 'cause_effect',
          topic: 'how many tides there are',
          semanticCue: 'Count the bulges, and remember the Earth turns once a day.',
          clozeAnswers: ['two high tides'],
        },
        {
          id: 's2-i2',
          text: 'High tide is when the water comes furthest up the beach; low tide is when it is furthest out.',
          sourceSpans: [
            'At high tide the water comes furthest up the beach, and at low tide it is furthest out',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'high and low tide',
          semanticCue: 'Picture the edge of the sea on a beach at two different times.',
          clozeAnswers: ['furthest up the beach'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why do most coasts get two high tides a day rather than one?',
        options: [
          'Because the wind changes direction twice a day',
          'Because the Sun rises and sets',
          'Because the turning Earth carries each coast through two bulges of water',
        ],
        answerIndex: 2,
        explanationSpan:
          'each stretch of coast is carried through both bulges and both low areas in between',
      },
    },
    {
      id: 's3',
      text: 'High tide does not come at the same time each day. While the Earth spins, the Moon is also moving along its orbit, so the Earth has to turn a little further each day to catch up with it. As a result, high tide arrives about 50 minutes later from one day to the next. Tide tables, published for ports and harbours, help sailors and walkers plan ahead.',
      ideas: [
        {
          id: 's3-i1',
          text: 'High tide comes about 50 minutes later each day.',
          sourceSpans: ['high tide arrives about 50 minutes later from one day to the next'],
          qualifiers: ['about'],
          relation: 'fact',
          topic: 'how the timing shifts',
          semanticCue:
            "Think about whether tomorrow's high tide will be earlier or later, and by how much.",
          clozeAnswers: ['50 minutes later'],
        },
        {
          id: 's3-i2',
          text: 'This happens because the Moon moves along its orbit, so the Earth must turn a little further to catch up.',
          sourceSpans: [
            'the Moon is also moving along its orbit, so the Earth has to turn a little further each day to catch up with it',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why the timing shifts',
          semanticCue: 'The Moon does not stay still while the Earth turns.',
          clozeAnswers: ['orbit', 'catch up'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why does high tide come later each day?',
        options: [
          'Because the Moon moves along its orbit, so the Earth must turn further to catch up',
          'Because the sea slows down in the evening',
          'Because the days are getting shorter',
        ],
        answerIndex: 0,
        explanationSpan:
          'the Moon is also moving along its orbit, so the Earth has to turn a little further each day to catch up with it',
      },
    },
    {
      id: 's4',
      text: 'The Sun pulls on the oceans too, though less strongly than the Moon. Near new moon and full moon, the Sun, Moon and Earth are roughly in a line, and their pulls add together. This gives spring tides, with higher high tides and lower low tides. The name has nothing to do with the season. Near half moon, the pulls partly cancel out, giving smaller neap tides.',
      ideas: [
        {
          id: 's4-i1',
          text: 'Near new and full moon, the Sun, Moon and Earth are roughly in line, so their pulls combine to give bigger spring tides.',
          sourceSpans: [
            'Near new moon and full moon, the Sun, Moon and Earth are roughly in a line, and their pulls add together',
            'This gives spring tides, with higher high tides and lower low tides',
          ],
          qualifiers: ['roughly'],
          relation: 'cause_effect',
          topic: 'the biggest tides',
          semanticCue: 'Think about what happens when two pulls line up and work together.',
          clozeAnswers: ['new moon and full moon'],
        },
        {
          id: 's4-i2',
          text: "Near half moon, the Sun's and Moon's pulls partly cancel out, giving smaller neap tides.",
          sourceSpans: ['Near half moon, the pulls partly cancel out, giving smaller neap tides'],
          qualifiers: [],
          relation: 'comparison',
          topic: 'the smallest tides',
          semanticCue: 'Think about the shape of the Moon halfway between new and full.',
          clozeAnswers: ['half moon', 'neap tides'],
        },
      ],
      question: {
        id: 's4-q1',
        prompt: 'When are spring tides most likely?',
        options: ['In the spring months', 'Near half moon', 'Near new moon and full moon'],
        answerIndex: 2,
        explanationSpan:
          'Near new moon and full moon, the Sun, Moon and Earth are roughly in a line, and their pulls add together.',
      },
    },
  ],
};

export default passage;
