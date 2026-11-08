import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p11-chance-of-rain',
  title: 'Reading the chance of rain',
  subject: 'practical',
  summary: 'How to read a rain percentage in a weather forecast, and what it does not tell you.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Met Office explanation of probability of precipitation: the chance of at least a small amount of rain falling at a particular location in a given time period; a 70% chance means that on about 7 of 10 occasions with such a forecast, rain would be expected. It does not mean rain for 70% of the time or over 70% of the area, and says nothing about how heavy the rain will be. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Weather forecasts often give a percentage for rain, such as a 70% chance. This is a measure of how likely it is that some rain will fall where you are during that time. A 70% chance means that, when forecasters see weather like this, rain falls on about seven out of every ten occasions. On the remaining occasions, it stays dry where you are.',
      ideas: [
        {
          id: 's1-i1',
          text: 'A rain percentage shows how likely it is that some rain will fall where you are in that time.',
          sourceSpans: [
            'This is a measure of how likely it is that some rain will fall where you are during that time',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what the number measures',
          semanticCue: 'Think about what the word "chance" itself means.',
          clozeAnswers: ['how likely'],
        },
        {
          id: 's1-i2',
          text: 'A 70% chance means rain falls on about seven of every ten occasions with weather like this.',
          sourceSpans: [
            'A 70% chance means that, when forecasters see weather like this, rain falls on about seven out of every ten occasions',
          ],
          qualifiers: ['about'],
          relation: 'fact',
          topic: 'what 70% means',
          semanticCue: 'Imagine ten different days that all had the same forecast.',
          clozeAnswers: ['seven out of every ten'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What does a rain percentage measure?',
        options: [
          'How heavy the rain will be',
          'How likely it is that some rain will fall where you are',
          'How many hours of rain there will be',
        ],
        answerIndex: 1,
        explanationSpan:
          'This is a measure of how likely it is that some rain will fall where you are during that time.',
      },
    },
    {
      id: 's2',
      text: 'A common mistake is to think that a 70% chance means it will rain for 70% of the day. It does not. Nor does it mean that 70% of the area will get wet. It simply tells you how likely it is that you will see at least some rain. A day with a 70% chance might bring one short shower, or rain from morning to night.',
      ideas: [
        {
          id: 's2-i1',
          text: 'A 70% chance does not mean it will rain for 70% of the day, or over 70% of the area.',
          sourceSpans: [
            'A common mistake is to think that a 70% chance means it will rain for 70% of the day. It does not',
            'Nor does it mean that 70% of the area will get wet',
          ],
          qualifiers: ['not'],
          relation: 'fact',
          topic: 'a common misunderstanding',
          semanticCue:
            'Think about two wrong readings of the number: one about time, one about place.',
          clozeAnswers: ['70% of the day'],
        },
        {
          id: 's2-i2',
          text: 'The same chance might bring one short shower or a whole day of rain.',
          sourceSpans: [
            'A day with a 70% chance might bring one short shower, or rain from morning to night',
          ],
          qualifiers: ['might'],
          relation: 'fact',
          topic: 'how long the rain lasts',
          semanticCue:
            'Think about whether the number says anything about how long the rain goes on.',
          clozeAnswers: ['one short shower'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Does a 70% chance of rain mean it will rain for 70% of the day?',
        options: [
          'Yes, it will rain for most of the day',
          'Yes, but only in the afternoon',
          'No, it tells you how likely rain is, not how long it lasts',
        ],
        answerIndex: 2,
        explanationSpan:
          'It simply tells you how likely it is that you will see at least some rain.',
      },
    },
    {
      id: 's3',
      text: 'The percentage does not tell you how heavy the rain will be. A low chance of a thunderstorm could still bring a sudden downpour, while a high chance could mean light drizzle. For a fuller picture, it helps to read the percentage alongside the weather symbols and the written forecast. An hour-by-hour forecast can also show when rain is most likely to arrive.',
      ideas: [
        {
          id: 's3-i1',
          text: 'The percentage does not tell you how heavy the rain will be.',
          sourceSpans: [
            'The percentage does not tell you how heavy the rain will be',
            'a high chance could mean light drizzle',
          ],
          qualifiers: ['not'],
          relation: 'fact',
          topic: 'what the number leaves out',
          semanticCue: 'Think about the difference between a downpour and drizzle.',
          clozeAnswers: ['how heavy'],
        },
        {
          id: 's3-i2',
          text: 'Reading the percentage with the symbols and written forecast gives a fuller picture.',
          sourceSpans: [
            'For a fuller picture, it helps to read the percentage alongside the weather symbols and the written forecast',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'getting a fuller picture',
          semanticCue: 'Think about what else a forecast shows you besides the number.',
          clozeAnswers: ['weather symbols', 'written forecast'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'A forecast shows a low chance of a thunderstorm. What could still happen?',
        options: [
          'A sudden downpour',
          'Nothing, because a low chance means it will stay dry',
          'Rain for the whole day, every day that week',
        ],
        answerIndex: 0,
        explanationSpan: 'A low chance of a thunderstorm could still bring a sudden downpour',
      },
    },
  ],
};

export default passage;
