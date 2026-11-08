import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p15-great-fire-of-london',
  title: 'The Great Fire of London',
  subject: 'history',
  summary: 'How a fire in a Pudding Lane bakery spread across the City of London in 1666.',
  density: 'dense',
  kind: 'library',
  factNotes:
    "Began in the early hours of Sunday 2 September 1666 at Thomas Farriner's bakery in Pudding Lane, near London Bridge; burned until about 5–6 September; a long dry summer, a strong east wind and close-packed timber houses helped it spread; firebreaks made by pulling down and blowing up houses, helped by the wind dropping; about 13,200 houses, 87 parish churches and old St Paul's destroyed; recorded deaths were few (often given as six) but the true toll is unknown and probably higher, so no figure is given; the Rebuilding Act 1667 required brick or stone; Wren designed the new St Paul's and many City churches; the Monument stands near Pudding Lane. High confidence.",
  sections: [
    {
      id: 's1',
      text: 'In the early hours of Sunday 2 September 1666, a fire broke out in a bakery on Pudding Lane, near London Bridge. The summer had been long and dry, and many houses in the City were built of wood, packed tightly together along narrow streets. A strong wind from the east blew the flames from building to building, and the fire spread quickly towards the west.',
      ideas: [
        {
          id: 's1-i1',
          text: 'The fire began early on Sunday 2 September 1666, in a bakery on Pudding Lane.',
          sourceSpans: [
            'In the early hours of Sunday 2 September 1666, a fire broke out in a bakery on Pudding Lane',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'where and when it started',
          semanticCue: 'Think of a building where ovens were lit before dawn.',
          clozeAnswers: ['bakery', 'Pudding Lane'],
        },
        {
          id: 's1-i2',
          text: 'A dry summer, tightly packed wooden houses and a strong east wind helped the fire spread fast.',
          sourceSpans: [
            'The summer had been long and dry, and many houses in the City were built of wood, packed tightly together along narrow streets',
            'A strong wind from the east blew the flames from building to building',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why it spread so fast',
          semanticCue: 'Think about the weather, the building material and the wind.',
          clozeAnswers: ['long and dry', 'wood'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Which of these helped the fire to spread so quickly?',
        options: [
          'Heavy rain earlier that week',
          'Wooden houses packed tightly together',
          'Wide streets lined with stone buildings',
        ],
        answerIndex: 1,
        explanationSpan:
          'many houses in the City were built of wood, packed tightly together along narrow streets',
      },
    },
    {
      id: 's2',
      text: 'The fire burned for about four days. People fled with what they could carry, some loading their goods onto boats on the Thames. To stop the flames, houses in their path were pulled down or blown up with gunpowder, leaving gaps that the fire could not cross. When the wind finally dropped, these firebreaks helped to bring the fire under control.',
      ideas: [
        {
          id: 's2-i1',
          text: 'The fire burned for about four days, and people fled with whatever they could carry.',
          sourceSpans: [
            'The fire burned for about four days',
            'People fled with what they could carry',
          ],
          qualifiers: ['about'],
          relation: 'fact',
          topic: 'how long it lasted',
          semanticCue: 'Think in days, not hours or weeks.',
          clozeAnswers: ['four days'],
        },
        {
          id: 's2-i2',
          text: 'Houses were pulled down or blown up to leave gaps the fire could not cross, and these helped once the wind dropped.',
          sourceSpans: [
            'houses in their path were pulled down or blown up with gunpowder, leaving gaps that the fire could not cross',
            'When the wind finally dropped, these firebreaks helped to bring the fire under control',
          ],
          qualifiers: ['not'],
          relation: 'cause_effect',
          topic: 'how it was stopped',
          semanticCue: 'Think about taking away what the fire needed to keep moving.',
          clozeAnswers: ['pulled down', 'blown up'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why were houses pulled down or blown up during the fire?',
        options: [
          'To rescue people trapped inside',
          'To use the timber to build boats',
          'To leave gaps the fire could not cross',
        ],
        answerIndex: 2,
        explanationSpan:
          'houses in their path were pulled down or blown up with gunpowder, leaving gaps that the fire could not cross',
      },
    },
    {
      id: 's3',
      text: "By the time it was over, more than 13,000 houses had been destroyed, along with 87 parish churches and the old St Paul's Cathedral. Many thousands of people lost their homes. Only a handful of deaths were recorded at the time, but the true number is not known. Many deaths may not have been written down, so the real number is likely to have been higher.",
      ideas: [
        {
          id: 's3-i1',
          text: "Over 13,000 houses were lost, as well as 87 parish churches and the old St Paul's Cathedral.",
          sourceSpans: [
            "more than 13,000 houses had been destroyed, along with 87 parish churches and the old St Paul's Cathedral",
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what was destroyed',
          semanticCue: 'Think of homes, churches and one great cathedral.',
          clozeAnswers: ['13,000 houses', '87 parish churches', "St Paul's Cathedral"],
        },
        {
          id: 's3-i2',
          text: 'Only a few deaths were recorded at the time, but the true number is not known.',
          sourceSpans: [
            'Only a handful of deaths were recorded at the time, but the true number is not known',
          ],
          qualifiers: ['only', 'not'],
          relation: 'comparison',
          topic: 'how many people died',
          semanticCue:
            'Think about the difference between what was written down and what really happened.',
          clozeAnswers: ['handful'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why might the real number of deaths have been higher than the number recorded?',
        options: [
          'The fire mostly burned at night',
          'Many deaths may not have been written down',
          'The records were lost in a later fire',
        ],
        answerIndex: 1,
        explanationSpan:
          'Many deaths may not have been written down, so the real number is likely to have been higher.',
      },
    },
    {
      id: 's4',
      text: "Rebuilding took many years. New rules required houses to be built of brick or stone rather than timber, to make another great fire less likely. The architect Christopher Wren designed the new St Paul's Cathedral, with its great dome, along with many of the City's new churches. Near Pudding Lane, a tall stone column called the Monument was put up to remember the fire.",
      ideas: [
        {
          id: 's4-i1',
          text: 'After the fire, new houses had to be brick or stone, not timber, to make another great fire less likely.',
          sourceSpans: [
            'New rules required houses to be built of brick or stone rather than timber, to make another great fire less likely',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'new building rules',
          semanticCue: 'Think about materials that do not burn easily.',
          clozeAnswers: ['brick or stone'],
        },
        {
          id: 's4-i2',
          text: "Christopher Wren designed the new St Paul's Cathedral and many of the City's new churches.",
          sourceSpans: [
            "The architect Christopher Wren designed the new St Paul's Cathedral",
            "along with many of the City's new churches",
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'who designed the new cathedral',
          semanticCue: 'Think of the famous architect whose name goes with the great dome.',
          clozeAnswers: ['Christopher Wren'],
        },
      ],
      question: {
        id: 's4-q1',
        prompt: 'Why did new houses have to be built of brick or stone?',
        options: [
          'All the timber had been used up',
          'To make another great fire less likely',
          'Brick was cheaper than wood at the time',
        ],
        answerIndex: 1,
        explanationSpan:
          'New rules required houses to be built of brick or stone rather than timber, to make another great fire less likely.',
      },
    },
  ],
};

export default passage;
