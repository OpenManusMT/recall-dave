import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p13-leap-years',
  title: 'Why we have leap years',
  subject: 'science',
  summary:
    'Why February sometimes has 29 days, and the century rule that keeps the calendar in step.',
  density: 'dense',
  kind: 'library',
  factNotes:
    'The solar (tropical) year is about 365.2422 days. The Julian rule adds a day every four years; the Gregorian reform (1582, adopted in Britain in 1752) skips the leap day in century years not divisible by 400. 2000 was a leap year; 1900 was not; 2100 will not be. 2024 and 2028 are leap years. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'A year is the time the Earth takes to travel once round the Sun, and that is about 365 and a quarter days. Our calendar year has 365 days, so each calendar year is about a quarter of a day too short. That may not sound much, but it adds up. Without a fix, the calendar would slowly drift, and over the centuries the seasons would fall in the wrong months.',
      ideas: [
        {
          id: 's1-i1',
          text: 'The Earth takes about 365 and a quarter days to orbit the Sun, but a calendar year has 365 days.',
          sourceSpans: [
            'the time the Earth takes to travel once round the Sun, and that is about 365 and a quarter days',
            'Our calendar year has 365 days',
          ],
          qualifiers: ['about'],
          relation: 'comparison',
          topic: 'two different lengths of year',
          semanticCue: "Compare the Earth's journey with the number of days on the calendar.",
          clozeAnswers: ['365 and a quarter days'],
        },
        {
          id: 's1-i2',
          text: 'Each calendar year is about a quarter-day short, so without a fix the seasons would drift into the wrong months.',
          sourceSpans: [
            'Without a fix, the calendar would slowly drift, and over the centuries the seasons would fall in the wrong months',
            'each calendar year is about a quarter of a day too short',
          ],
          qualifiers: ['about'],
          relation: 'cause_effect',
          topic: 'what would go wrong',
          semanticCue: 'Think about small amounts of time building up over hundreds of years.',
          clozeAnswers: ['seasons', 'wrong months'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What would happen if we never added an extra day?',
        options: [
          'Over the centuries, the seasons would fall in the wrong months',
          'The Earth would gradually slow down',
          'February would slowly disappear',
        ],
        answerIndex: 0,
        explanationSpan:
          'Without a fix, the calendar would slowly drift, and over the centuries the seasons would fall in the wrong months.',
      },
    },
    {
      id: 's2',
      text: 'The fix is the leap year. Every four years, the four quarter days are gathered into one whole extra day, which is added to the end of February as the 29th. A leap year therefore has 366 days. As a general rule, a year is a leap year if it can be divided exactly by four, so 2024 and 2028 are both leap years.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Every four years, the quarter days are gathered into an extra day, 29 February, giving a year of 366 days.',
          sourceSpans: [
            'Every four years, the four quarter days are gathered into one whole extra day, which is added to the end of February as the 29th',
            'A leap year therefore has 366 days',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'where the extra day goes',
          semanticCue: 'Think of the shortest month, and the date it gains.',
          clozeAnswers: ['February', '29th'],
        },
        {
          id: 's2-i2',
          text: 'As a general rule, a year that divides exactly by four, such as 2024, is a leap year.',
          sourceSpans: [
            'a year is a leap year if it can be divided exactly by four',
            'so 2024 and 2028 are both leap years',
          ],
          qualifiers: [],
          relation: 'rule_exception',
          topic: 'the basic rule for spotting one',
          semanticCue: 'Think about a simple division you could do in your head.',
          clozeAnswers: ['divided exactly by four'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why does a leap year have 366 days?',
        options: [
          'The Earth speeds up every four years',
          'Four quarter days are gathered into one extra day',
          'An extra day is added to the end of December',
        ],
        answerIndex: 1,
        explanationSpan:
          'Every four years, the four quarter days are gathered into one whole extra day, which is added to the end of February as the 29th.',
      },
    },
    {
      id: 's3',
      text: "There is one exception. The Earth's year is actually a little shorter than 365 and a quarter days, so adding a day every four years slightly overcorrects. To balance this, century years are not leap years unless they can be divided exactly by 400. So 2000 was a leap year, but 1900 was not, and 2100 will not be either. This rule has kept our calendar in step since it was adopted in Britain in 1752.",
      ideas: [
        {
          id: 's3-i1',
          text: 'Century years are not leap years unless they divide exactly by 400.',
          sourceSpans: [
            'century years are not leap years unless they can be divided exactly by 400',
          ],
          qualifiers: ['not', 'unless'],
          relation: 'rule_exception',
          topic: 'the exception to the four-year rule',
          semanticCue: 'Think about years ending in 00, and a much bigger number to divide by.',
          clozeAnswers: ['century years', '400'],
        },
        {
          id: 's3-i2',
          text: 'So 2000 was a leap year, but 1900 was not, and 2100 will not be.',
          sourceSpans: ['So 2000 was a leap year, but 1900 was not, and 2100 will not be either'],
          qualifiers: ['not'],
          relation: 'rule_exception',
          topic: 'examples of the exception',
          semanticCue: 'One recent century year passed the test, but the one before it failed.',
          clozeAnswers: ['2000', '1900'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why was 2000 a leap year when 1900 was not?',
        options: [
          'Leap years were not used in 1900',
          'The rule was changed in the year 2000',
          '2000 can be divided exactly by 400, but 1900 cannot',
        ],
        answerIndex: 2,
        explanationSpan:
          'century years are not leap years unless they can be divided exactly by 400',
      },
    },
  ],
};

export default passage;
