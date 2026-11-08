import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'probe-04-salt-on-roads',
  title: 'Salt on icy roads',
  subject: 'science',
  summary: 'Why gritting lorries spread salt on frosty nights, and when it works less well.',
  density: 'light',
  kind: 'probe',
  factNotes:
    'Dissolved salt lowers the freezing point of water, so ice melts into brine and new ice is less likely to form; rock salt becomes much less effective at very low temperatures, so no exact threshold is given (figures of roughly -5 to -10°C are often quoted). UK gritters spread rock salt. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'On frosty nights, gritting lorries go out to spread rock salt on the roads. Salt works because, once it dissolves in water, it lowers the temperature at which that water freezes. Ice on the road starts to melt into salty water, and new ice is less likely to form. However, salt works less well in very cold weather, and in a hard frost the roads can still become icy.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Dissolved salt lowers the temperature at which water freezes, so ice melts and new ice is less likely to form.',
          sourceSpans: [
            'once it dissolves in water, it lowers the temperature at which that water freezes',
            'new ice is less likely to form',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how salt melts ice',
          semanticCue: 'Think about what salt does to the point at which water turns to ice.',
          clozeAnswers: ['lowers the temperature'],
        },
        {
          id: 's1-i2',
          text: 'Salt works less well in very cold weather, so roads can still become icy in a hard frost.',
          sourceSpans: [
            'salt works less well in very cold weather, and in a hard frost the roads can still become icy',
          ],
          qualifiers: [],
          relation: 'rule_exception',
          topic: 'when salt struggles',
          semanticCue: 'Think about the coldest kind of winter night.',
          clozeAnswers: ['very cold weather'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why can a salted road still become icy?',
        options: [
          'Salt makes water freeze faster',
          'The salt washes the grit away',
          'Salt works less well in very cold weather',
        ],
        answerIndex: 2,
        explanationSpan:
          'However, salt works less well in very cold weather, and in a hard frost the roads can still become icy.',
      },
    },
  ],
};

export default passage;
