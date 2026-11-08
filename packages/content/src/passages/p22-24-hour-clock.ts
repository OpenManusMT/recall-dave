import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p22-24-hour-clock',
  title: 'Reading the 24-hour clock',
  subject: 'practical',
  summary:
    'How to read times like 15:40 on a timetable, and turn them into morning or evening times.',
  density: 'light',
  kind: 'library',
  factNotes:
    '24-hour notation: hours run from 00 to 23, so the day ends at 23:59; 00:00 is midnight and 12:00 is midday; for afternoon and evening times, add 12 to the pm hour (3:40 pm is 15:40), and take 12 away from hours of 13 or more to read them back. UK bus and rail timetables generally use the 24-hour clock (hedged with "usually"). Chose the 24-hour clock rather than a general bus timetable passage. High confidence.',
  sections: [
    {
      id: 's1',
      text: "Bus and train timetables in Britain usually use the 24-hour clock. Instead of starting again at one o'clock after midday, the hours keep counting up through the afternoon and evening, all the way to 23:59. The day starts at midnight, written 00:00, and midday is written 12:00. Morning times look much the same as usual, so 09:15 is a quarter past nine in the morning.",
      ideas: [
        {
          id: 's1-i1',
          text: 'Timetables in Britain usually use the 24-hour clock, where the hours keep counting up after midday.',
          sourceSpans: [
            'the hours keep counting up through the afternoon and evening, all the way to 23:59',
            'Bus and train timetables in Britain usually use the 24-hour clock',
          ],
          qualifiers: ['usually'],
          relation: 'fact',
          topic: 'how the 24-hour clock counts',
          semanticCue: "Think about what happens to the numbers after twelve o'clock.",
          clozeAnswers: ['keep counting up', '23:59'],
        },
        {
          id: 's1-i2',
          text: 'Midnight is written 00:00 and midday 12:00, and morning times look much as they normally do.',
          sourceSpans: [
            'The day starts at midnight, written 00:00, and midday is written 12:00',
            'Morning times look much the same as usual',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'the start and middle of the day',
          semanticCue: 'Think about how the day begins with a row of zeros.',
          clozeAnswers: ['00:00', '12:00'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'On a 24-hour timetable, what does 09:15 mean?',
        options: [
          'A quarter past nine in the evening',
          'A quarter past nine in the morning',
          'Fifteen minutes past midnight',
        ],
        answerIndex: 1,
        explanationSpan: 'so 09:15 is a quarter past nine in the morning',
      },
    },
    {
      id: 's2',
      text: 'To change an afternoon or evening time into the 24-hour clock, add 12 to the hour. So 3:40 pm becomes 15:40, and 8 pm becomes 20:00. To go the other way, take 12 away from any hour of 13 or more. If a timetable shows a bus at 18:30, take away 12 to find it leaves at half past six in the evening.',
      ideas: [
        {
          id: 's2-i1',
          text: 'For an afternoon or evening time, add 12 to the hour, so 3:40 pm becomes 15:40.',
          sourceSpans: [
            'To change an afternoon or evening time into the 24-hour clock, add 12 to the hour',
            'So 3:40 pm becomes 15:40',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'turning afternoon times into 24-hour times',
          semanticCue: 'Think about how many hours have already passed by midday.',
          clozeAnswers: ['add 12'],
        },
        {
          id: 's2-i2',
          text: 'To read an hour of 13 or more, take away 12: a bus at 18:30 leaves at half past six in the evening.',
          sourceSpans: [
            'take 12 away from any hour of 13 or more',
            'a bus at 18:30, take away 12 to find it leaves at half past six in the evening',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'reading later times on a timetable',
          semanticCue: 'Do the same sum, but the other way round.',
          clozeAnswers: ['take 12 away'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'A timetable shows a train at 16:50. When does it leave?',
        options: [
          'Ten to five in the afternoon',
          'Ten to four in the afternoon',
          'Ten to six in the evening',
        ],
        answerIndex: 0,
        explanationSpan: 'take 12 away from any hour of 13 or more',
      },
    },
  ],
};

export default passage;
