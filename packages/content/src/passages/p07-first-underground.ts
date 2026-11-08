import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p07-first-underground',
  title: 'The first Underground line',
  subject: 'history',
  summary:
    "How London opened the world's first underground railway in 1863, worked by steam trains.",
  density: 'medium',
  kind: 'library',
  factNotes:
    'The Metropolitan Railway opened on 10 January 1863 between Paddington (Bishop\'s Road) and Farringdon Street; the world\'s first underground railway; built largely by cut and cover beneath existing streets; worked by steam locomotives (designed to condense steam and reduce smoke) pulling gas-lit carriages; around 38,000 passengers on the opening day is the figure widely cited by TfL, so it is hedged with "about" and "are said to". The first deep-level electric tube, the City and South London Railway, opened in 1890. High confidence on dates and route.',
  sections: [
    {
      id: 's1',
      text: "By the 1850s, London's streets were jammed with horse-drawn carts, buses and cabs, and many of the main railway stations stood on the edge of the centre. The answer was a railway underneath the roads. In January 1863, the Metropolitan Railway opened between Paddington and Farringdon. It was the first underground railway in the world, and about 38,000 passengers are said to have used it on its first day.",
      ideas: [
        {
          id: 's1-i1',
          text: "The Metropolitan Railway opened between Paddington and Farringdon in January 1863, the world's first underground railway.",
          sourceSpans: [
            'In January 1863, the Metropolitan Railway opened between Paddington and Farringdon',
            'It was the first underground railway in the world',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'when and where it opened',
          semanticCue:
            'Think of a station in west London, a station near the City, and the reign of Queen Victoria.',
          clozeAnswers: ['January 1863', 'Paddington and Farringdon'],
        },
        {
          id: 's1-i2',
          text: 'It was built because the streets above were jammed with horse-drawn traffic.',
          sourceSpans: [
            "London's streets were jammed with horse-drawn carts, buses and cabs",
            'The answer was a railway underneath the roads',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why it was built',
          semanticCue: 'Think about what the roads above were like at the time.',
          clozeAnswers: ['jammed'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: "Why was a railway built underneath London's roads?",
        options: [
          'The streets above were jammed with traffic',
          'Steam trains were banned above ground',
          'The ground was too soft for surface tracks',
        ],
        answerIndex: 0,
        explanationSpan: "London's streets were jammed with horse-drawn carts, buses and cabs",
      },
    },
    {
      id: 's2',
      text: 'The line was built by a method called "cut and cover". Workers dug a deep trench, mostly along the line of existing streets, built a brick tunnel inside it, and then covered it over and put the road back on top. It was hard, disruptive work for the people living nearby, but it was much simpler and cheaper than boring a tunnel deep underground.',
      ideas: [
        {
          id: 's2-i1',
          text: 'With "cut and cover", a trench was dug along a street, a brick tunnel built in it, and the road put back on top.',
          sourceSpans: [
            'Workers dug a deep trench, mostly along the line of existing streets, built a brick tunnel inside it, and then covered it over and put the road back on top',
            'a method called "cut and cover"',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'how the tunnels were made',
          semanticCue: 'The name of the method describes its two main steps.',
          clozeAnswers: ['trench', 'brick tunnel'],
        },
        {
          id: 's2-i2',
          text: 'It disrupted people living nearby, but was simpler and cheaper than boring a deep tunnel.',
          sourceSpans: [
            'It was hard, disruptive work for the people living nearby, but it was much simpler and cheaper than boring a tunnel deep underground',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'why that method was chosen',
          semanticCue: 'Compare digging down from the street with digging sideways far below it.',
          clozeAnswers: ['simpler and cheaper'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What was the "cut and cover" method?',
        options: [
          'Boring a tunnel deep below the city',
          'Digging a trench, building a tunnel in it and covering it over',
          'Laying tracks on bridges over the streets',
        ],
        answerIndex: 1,
        explanationSpan:
          'Workers dug a deep trench, mostly along the line of existing streets, built a brick tunnel inside it, and then covered it over and put the road back on top.',
      },
    },
    {
      id: 's3',
      text: 'The first trains were pulled by steam locomotives, and the carriages were lit by gas. The engines were designed to cut down their smoke in the tunnels, yet the stations and tunnels were often smoky and full of steam. Even so, the railway was a success and soon grew. The first deep "tube" line with electric trains did not open until 1890.',
      ideas: [
        {
          id: 's3-i1',
          text: 'The first trains were pulled by steam engines, and the tunnels and stations were often smoky.',
          sourceSpans: [
            'The first trains were pulled by steam locomotives',
            'the stations and tunnels were often smoky and full of steam',
          ],
          qualifiers: ['often'],
          relation: 'cause_effect',
          topic: 'what pulled the first trains',
          semanticCue: 'Think about what powered most Victorian trains, and what came out of them.',
          clozeAnswers: ['steam locomotives'],
        },
        {
          id: 's3-i2',
          text: 'Deep "tube" lines with electric trains did not open until 1890.',
          sourceSpans: ['The first deep "tube" line with electric trains did not open until 1890'],
          qualifiers: ['not'],
          relation: 'sequence',
          topic: 'what came later',
          semanticCue: 'Think about a cleaner kind of power, a generation later.',
          clozeAnswers: ['electric trains', '1890'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why were the early Underground stations often smoky?',
        options: [
          'Passengers were allowed to smoke on the platforms',
          'The carriages were heated by coal fires',
          'The trains were pulled by steam locomotives',
        ],
        answerIndex: 2,
        explanationSpan: 'The first trains were pulled by steam locomotives',
      },
    },
  ],
};

export default passage;
