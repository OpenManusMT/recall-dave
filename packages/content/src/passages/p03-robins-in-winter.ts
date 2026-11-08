import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p03-robins-in-winter',
  title: 'Robins in winter',
  subject: 'nature',
  summary: 'Why you can still hear robins singing on a cold winter morning.',
  density: 'light',
  kind: 'library',
  factNotes:
    'RSPB and BTO: robins in the UK sing in almost every month, with a short pause during the late-summer moult; unusually among British birds, females as well as males hold individual winter territories and sing to defend them; pairs form towards the end of winter. Winter song is widely described as thinner or more wistful (hedged with "tends"). Left out the Victorian postman story. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'When the nesting season is over, many garden birds sing much less. Robins are different. After a short quiet spell in late summer, they start singing again and carry on right through the autumn and winter. On a cold, grey December morning, a robin is often one of the few birds you can hear. Its winter song tends to sound thinner and sadder than in spring.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Unlike many garden birds, robins start singing again after a short summer break and keep going through autumn and winter.',
          sourceSpans: [
            'they start singing again and carry on right through the autumn and winter',
            'many garden birds sing much less',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'when robins sing',
          semanticCue: 'Think about the seasons when most other birds have gone quiet.',
          clozeAnswers: ['autumn and winter'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What is unusual about robins compared with many garden birds?',
        options: [
          'They keep singing through autumn and winter',
          'They fly south for the winter',
          'They sing only at night',
        ],
        answerIndex: 0,
        explanationSpan:
          'they start singing again and carry on right through the autumn and winter',
      },
    },
    {
      id: 's2',
      text: 'The reason is territory. Robins need a patch with enough food to survive the cold months, and they sing to warn other robins to keep out. In winter, female robins hold their own territories too, separate from the males, and they sing to defend them just as the males do. This is unusual among British birds. Towards the end of winter, males and females start to pair up for the breeding season.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Robins sing in winter to defend a patch with enough food to see them through the cold.',
          sourceSpans: [
            'Robins need a patch with enough food to survive the cold months, and they sing to warn other robins to keep out',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why robins sing in winter',
          semanticCue:
            'Think about what a robin needs to get through the cold, and who it wants to keep away.',
          clozeAnswers: ['enough food', 'keep out'],
        },
        {
          id: 's2-i2',
          text: 'In winter, female robins hold and defend their own territories with song, just as males do.',
          sourceSpans: [
            'female robins hold their own territories too, separate from the males, and they sing to defend them just as the males do',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'something unusual about winter territories',
          semanticCue: 'Think about whether it is just one sex that has a patch of its own.',
          clozeAnswers: ['female robins', 'own territories'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why do robins sing in winter?',
        options: [
          'To call swallows back from Africa',
          'To keep other robins out of their patch',
          'To keep themselves warm',
        ],
        answerIndex: 1,
        explanationSpan: 'they sing to warn other robins to keep out',
      },
    },
  ],
};

export default passage;
