import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-03-penny-black',
  title: 'The Penny Black',
  subject: 'history',
  summary: "The story of the world's first postage stamp, and how it changed sending letters.",
  density: 'medium',
  kind: 'probe',
  factNotes:
    "The Penny Black, issued in Britain in 1840 as part of Rowland Hill's postal reforms, was the world's first adhesive postage stamp; it showed a profile of the young Queen Victoria; it prepaid a letter of up to half an ounce for one penny anywhere in the country. Before this, postage usually depended on distance (and number of sheets) and was often paid by the recipient. Exact issue dates left out. High confidence.",
  sections: [
    {
      id: 's1',
      text: 'Before 1840, sending a letter in Britain could be costly and complicated. The price usually depended on how far the letter travelled, and it was often paid by the person receiving it rather than the sender. Then, in 1840, Britain issued the Penny Black, the first sticky-backed postage stamp in the world. It showed the head of the young Queen Victoria, and for one penny an ordinary letter could be sent anywhere in the country.',
      ideas: [
        {
          id: 's1-i1',
          text: "In 1840 Britain issued the Penny Black, the world's first sticky-backed postage stamp, showing Queen Victoria.",
          sourceSpans: [
            'in 1840, Britain issued the Penny Black, the first sticky-backed postage stamp in the world',
            'It showed the head of the young Queen Victoria',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what the Penny Black was',
          semanticCue: 'Think of the young queen near the start of her long reign.',
          clozeAnswers: ['1840', 'first sticky-backed postage stamp'],
        },
        {
          id: 's1-i2',
          text: 'Before it, the price usually depended on distance and was often paid by the receiver; after, a penny sent a letter anywhere.',
          sourceSpans: [
            'The price usually depended on how far the letter travelled, and it was often paid by the person receiving it',
            'for one penny an ordinary letter could be sent anywhere in the country',
          ],
          qualifiers: ['usually', 'often'],
          relation: 'comparison',
          topic: 'how paying for post changed',
          semanticCue: 'Think about who paid, and whether distance mattered, before and after.',
          clozeAnswers: ['how far the letter travelled'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'How did the Penny Black change sending a letter?',
        options: [
          'Letters became free to send',
          'The person receiving the letter had to pay more',
          'One penny could send an ordinary letter anywhere in the country',
        ],
        answerIndex: 2,
        explanationSpan: 'for one penny an ordinary letter could be sent anywhere in the country',
      },
    },
  ],
};

export default passage;
