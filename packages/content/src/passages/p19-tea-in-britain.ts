import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p19-tea-in-britain',
  title: 'How tea came to Britain',
  subject: 'food',
  summary: 'How tea went from a costly royal fashion to an everyday British drink.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Tea was first sold in London in the late 1650s, largely through coffee houses; Catherine of Braganza, a Portuguese princess who married Charles II in 1662, was a tea drinker and is widely credited with making it fashionable at court; tea came from China, was heavily taxed and was kept in locked caddies; smuggling was widespread in the 1700s; the Commutation Act of 1784 cut the duty sharply; large-scale growing in British India (from the mid-1800s) and later Ceylon brought prices down until tea was an everyday drink for all classes. Medium-high confidence; kept to well-attested dates.',
  sections: [
    {
      id: 's1',
      text: 'Tea first went on sale in London in the 1650s, mostly in coffee houses, but few people had tasted it. That began to change after 1662, when King Charles II married Catherine of Braganza, a Portuguese princess. Tea drinking was already popular at the Portuguese court, and Catherine brought the habit with her. Soon it became fashionable among wealthy people at the English court.',
      ideas: [
        {
          id: 's1-i1',
          text: 'After marrying Charles II in 1662, Catherine of Braganza brought her tea habit from Portugal and helped make it fashionable at court.',
          sourceSpans: [
            'after 1662, when King Charles II married Catherine of Braganza',
            'Tea drinking was already popular at the Portuguese court, and Catherine brought the habit with her',
            'it became fashionable among wealthy people at the English court',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'a royal influence',
          semanticCue: 'Think of a queen who came to England from Portugal.',
          clozeAnswers: ['Catherine of Braganza'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'How did Catherine of Braganza help make tea popular?',
        options: [
          'She brought the tea-drinking habit from Portugal to the English court',
          'She opened the first coffee house in London',
          'She grew tea in the royal gardens',
        ],
        answerIndex: 0,
        explanationSpan:
          'Tea drinking was already popular at the Portuguese court, and Catherine brought the habit with her.',
      },
    },
    {
      id: 's2',
      text: 'For a long time, tea remained a luxury. It was carried all the way from China and was heavily taxed, so a small amount was very expensive. Wealthy households often kept their precious tea locked away in a box called a caddy. The high tax also meant that a great deal of tea was smuggled into Britain and sold illegally.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Tea was a costly luxury, because it came all the way from China and was heavily taxed.',
          sourceSpans: [
            'It was carried all the way from China and was heavily taxed, so a small amount was very expensive',
            'tea remained a luxury',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why tea was costly',
          semanticCue: 'Think about the long journey, and what the government added to the price.',
          clozeAnswers: ['China', 'heavily taxed'],
        },
        {
          id: 's2-i2',
          text: 'Because of the high tax, a great deal of tea was smuggled into Britain.',
          sourceSpans: [
            'The high tax also meant that a great deal of tea was smuggled into Britain and sold illegally',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'an illegal trade',
          semanticCue: 'Think about what people do when something is taxed very highly.',
          clozeAnswers: ['smuggled'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why was so much tea smuggled into Britain?',
        options: [
          'It had been banned by the king',
          'The tax on it was very high',
          'Ships from China were not allowed to land',
        ],
        answerIndex: 1,
        explanationSpan:
          'The high tax also meant that a great deal of tea was smuggled into Britain and sold illegally.',
      },
    },
    {
      id: 's3',
      text: 'Things changed in 1784, when the tax on tea was cut sharply, making legal tea much cheaper and smuggling far less worthwhile. In the 1800s, the British began growing tea on a large scale in India, and later in Ceylon, now Sri Lanka. With more tea arriving and prices falling, it became an everyday drink for people of every class.',
      ideas: [
        {
          id: 's3-i1',
          text: 'A big tax cut in 1784 made legal tea much cheaper and smuggling less worthwhile.',
          sourceSpans: [
            'in 1784, when the tax on tea was cut sharply, making legal tea much cheaper and smuggling far less worthwhile',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'a change in the 1780s',
          semanticCue: 'Think about what lowering a tax does to prices.',
          clozeAnswers: ['1784', 'cut sharply'],
        },
        {
          id: 's3-i2',
          text: 'Large tea gardens in India and Ceylon brought prices down, and tea became an everyday drink for everyone.',
          sourceSpans: [
            'the British began growing tea on a large scale in India, and later in Ceylon',
            'it became an everyday drink for people of every class',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how tea became an everyday drink',
          semanticCue: "Think about where much of Britain's tea came to be grown.",
          clozeAnswers: ['India', 'Ceylon'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'What helped tea become an everyday drink in the 1800s?',
        options: [
          'A new law made everyone drink it',
          'Coffee was banned in Britain',
          'More tea arrived from India and Ceylon, and prices fell',
        ],
        answerIndex: 2,
        explanationSpan:
          'With more tea arriving and prices falling, it became an everyday drink for people of every class.',
      },
    },
  ],
};

export default passage;
