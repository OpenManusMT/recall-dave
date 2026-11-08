import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p09-descaling-a-kettle',
  title: 'Descaling a kettle',
  subject: 'home',
  summary: 'Where the pale crust inside a kettle comes from, and a simple way to remove it.',
  density: 'light',
  kind: 'library',
  factNotes:
    'Hard water carries dissolved calcium (and magnesium) compounds picked up from chalk and limestone; much of south and east England has hard water. Heating deposits calcium carbonate as limescale. Mild acids such as citric acid or vinegar dissolve it. Rinse, then boil fresh water and pour it away to clear traces and taste. Avoided specific quantities and soaking times and pointed to product instructions instead. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'In many parts of Britain, especially the south and east of England, tap water is "hard". This means it carries dissolved minerals, mainly calcium, picked up as rainwater soaks through chalk and limestone. When the water is heated, some of these minerals come out of the water and form a pale, chalky crust called limescale. In a kettle, it builds up on the base and can flake into your drinks.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Hard water carries dissolved minerals, picked up as rainwater soaks through chalk and limestone.',
          sourceSpans: [
            'it carries dissolved minerals, mainly calcium, picked up as rainwater soaks through chalk and limestone',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what makes water hard',
          semanticCue:
            'Think about the kind of rock the rain passes through on its way to your tap.',
          clozeAnswers: ['dissolved minerals', 'chalk and limestone'],
        },
        {
          id: 's1-i2',
          text: 'When hard water is heated, minerals come out of it and form a chalky crust called limescale.',
          sourceSpans: [
            'When the water is heated, some of these minerals come out of the water and form a pale, chalky crust called limescale',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'where the crust comes from',
          semanticCue: 'Think about what heating does to the water in the kettle.',
          clozeAnswers: ['limescale'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What causes limescale to form in a kettle?',
        options: [
          'Rust from the metal base',
          'Minerals in hard water coming out when it is heated',
          'Soap left over from washing up',
        ],
        answerIndex: 1,
        explanationSpan:
          'When the water is heated, some of these minerals come out of the water and form a pale, chalky crust called limescale.',
      },
    },
    {
      id: 's2',
      text: 'A mild acid dissolves limescale. You can buy a kettle descaler, which is often based on citric acid, or use a mixture of white vinegar and water. Leave it to soak, following any instructions on the product, then pour it away. Afterwards, rinse the kettle well, fill it with fresh water, boil it and pour that water away too. This clears any leftover taste before you make a drink.',
      ideas: [
        {
          id: 's2-i1',
          text: 'A mild acid dissolves limescale; descalers often use citric acid, or you can use white vinegar and water.',
          sourceSpans: [
            'A mild acid dissolves limescale',
            'which is often based on citric acid, or use a mixture of white vinegar and water',
          ],
          qualifiers: ['often'],
          relation: 'cause_effect',
          topic: 'what removes limescale',
          semanticCue:
            'Think of something sour, like lemon juice, or a bottle in the kitchen cupboard.',
          clozeAnswers: ['mild acid'],
        },
        {
          id: 's2-i2',
          text: 'Afterwards, rinse the kettle, then boil fresh water and pour it away to clear any taste.',
          sourceSpans: [
            'rinse the kettle well, fill it with fresh water, boil it and pour that water away too',
            'This clears any leftover taste',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'what to do afterwards',
          semanticCue: 'Think about the steps before the kettle is used for a drink again.',
          clozeAnswers: ['rinse', 'pour that water away'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why should you boil fresh water and pour it away after descaling?',
        options: [
          'To make the kettle boil faster next time',
          'To test that the kettle still works',
          'To clear any leftover taste',
        ],
        answerIndex: 2,
        explanationSpan: 'This clears any leftover taste before you make a drink.',
      },
    },
  ],
};

export default passage;
