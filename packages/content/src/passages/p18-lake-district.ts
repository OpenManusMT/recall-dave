import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p18-lake-district',
  title: 'The Lake District',
  subject: 'places',
  summary: "England's highest mountain, its largest natural lake, and why the area is protected.",
  density: 'medium',
  kind: 'library',
  factNotes:
    'Lake District, Cumbria: Scafell Pike, 978 m, is the highest mountain in England; Windermere, roughly 10.5–11 miles long (given as "more than ten miles"), is the largest natural lake in England; valleys and lakes shaped by glaciers in the last Ice Age; designated a National Park in 1951, one of the first in Britain; inscribed as a UNESCO World Heritage Site in 2017 as a cultural landscape (hill farming, and inspiration for writers and artists such as Wordsworth, who lived at Grasmere). High confidence. Left out the claim that only Bassenthwaite Lake has "lake" in its name.',
  sections: [
    {
      id: 's1',
      text: 'The Lake District lies in Cumbria, in the north-west of England. It is a landscape of steep mountains, known locally as fells, with long lakes lying in the valleys between them. The highest of these mountains is Scafell Pike, which rises to 978 metres. It is the highest mountain in England, and its rocky summit is often hidden in cloud.',
      ideas: [
        {
          id: 's1-i1',
          text: 'The Lake District is in Cumbria, in north-west England, with steep fells and long lakes in the valleys.',
          sourceSpans: [
            'The Lake District lies in Cumbria, in the north-west of England',
            'a landscape of steep mountains, known locally as fells, with long lakes lying in the valleys between them',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'where it is and what it looks like',
          semanticCue:
            'Think of a county in the far corner of England, and the local word for its hills.',
          clozeAnswers: ['Cumbria', 'north-west'],
        },
        {
          id: 's1-i2',
          text: 'Scafell Pike, at 978 metres, is the highest mountain in England.',
          sourceSpans: [
            'The highest of these mountains is Scafell Pike, which rises to 978 metres',
            'It is the highest mountain in England',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'the highest peak',
          semanticCue: 'Think of a peak just short of a thousand metres high.',
          clozeAnswers: ['Scafell Pike', '978 metres'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What is special about Scafell Pike?',
        options: [
          'It is the largest lake in England',
          'It is the highest mountain in England',
          'It is the oldest town in Cumbria',
        ],
        answerIndex: 1,
        explanationSpan: 'It is the highest mountain in England',
      },
    },
    {
      id: 's2',
      text: 'The valleys and lakes were shaped during the last Ice Age, when huge glaciers ground their way through the hills and carved out deep, U-shaped valleys. When the ice melted, water filled many of the hollows. The largest of the lakes is Windermere, which is more than ten miles long. It is the largest natural lake in England.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Glaciers in the last Ice Age carved deep valleys, and water filled the hollows when the ice melted.',
          sourceSpans: [
            'huge glaciers ground their way through the hills and carved out deep, U-shaped valleys',
            'When the ice melted, water filled many of the hollows',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how the lakes formed',
          semanticCue: 'Think of rivers of ice moving slowly through the hills long ago.',
          clozeAnswers: ['glaciers', 'U-shaped valleys'],
        },
        {
          id: 's2-i2',
          text: 'Windermere, over ten miles long, is the largest natural lake in England.',
          sourceSpans: [
            'The largest of the lakes is Windermere, which is more than ten miles long',
            'It is the largest natural lake in England',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'the biggest lake',
          semanticCue: 'Its name ends in an old word for a lake.',
          clozeAnswers: ['Windermere'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'How were the deep valleys of the Lake District formed?',
        options: [
          'By glaciers during the last Ice Age',
          'By the sea flooding the land',
          'By people digging for stone',
        ],
        answerIndex: 0,
        explanationSpan:
          'The valleys and lakes were shaped during the last Ice Age, when huge glaciers ground their way through the hills and carved out deep, U-shaped valleys.',
      },
    },
    {
      id: 's3',
      text: "In 1951, the Lake District became one of Britain's first National Parks, which means its landscape is given special protection. In 2017, it was also named a World Heritage Site. This recognised how centuries of hill farming have shaped the land, and how the scenery inspired writers and artists, such as the poet William Wordsworth, who lived at Grasmere.",
      ideas: [
        {
          id: 's3-i1',
          text: "In 1951 the Lake District became one of Britain's first National Parks, giving its landscape special protection.",
          sourceSpans: [
            "In 1951, the Lake District became one of Britain's first National Parks",
            'its landscape is given special protection',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'protection in the 1950s',
          semanticCue: 'Think of a kind of park that covers a whole region.',
          clozeAnswers: ['1951', 'National Parks'],
        },
        {
          id: 's3-i2',
          text: 'In 2017 it became a World Heritage Site, for its hill farming and the writers and artists it inspired.',
          sourceSpans: [
            'In 2017, it was also named a World Heritage Site',
            'how centuries of hill farming have shaped the land, and how the scenery inspired writers and artists',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'a more recent honour',
          semanticCue: 'Think of farmers on the fells, and a famous poet.',
          clozeAnswers: ['2017', 'World Heritage Site'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt:
          'Which of these was part of the reason the Lake District became a World Heritage Site?',
        options: [
          'It has the busiest roads in England',
          'It is the oldest National Park in the world',
          'Centuries of hill farming have shaped the land',
        ],
        answerIndex: 2,
        explanationSpan: 'This recognised how centuries of hill farming have shaped the land',
      },
    },
  ],
};

export default passage;
