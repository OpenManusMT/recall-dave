import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p01-bread',
  title: 'Why bread rises',
  subject: 'food',
  summary: 'What yeast does inside dough, and why kneading and resting matter.',
  density: 'light',
  kind: 'library',
  factNotes:
    'Standard baking science: yeast ferments sugars producing carbon dioxide and alcohol; gluten network traps gas; kneading develops gluten; oven heat expands gas and kills yeast, alcohol evaporates. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Yeast is a tiny living fungus. When it is mixed into dough, it feeds on the sugars in the flour and gives off a gas called carbon dioxide. The gas forms thousands of small bubbles, and these bubbles make the dough grow larger. This is why bread dough is left in a warm place for an hour or two before baking.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Yeast feeds on sugars in the flour and gives off carbon dioxide gas.',
          sourceSpans: ['it feeds on the sugars in the flour and gives off a gas called carbon dioxide'],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what the yeast does in the dough',
          semanticCue: 'Think about what the yeast eats, and what it releases.',
          clozeAnswers: ['sugars', 'carbon dioxide'],
        },
        {
          id: 's1-i2',
          text: 'The gas makes bubbles that make the dough grow, so dough is left somewhere warm to rise.',
          sourceSpans: [
            'these bubbles make the dough grow larger',
            'bread dough is left in a warm place for an hour or two before baking',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why the dough gets bigger',
          semanticCue: 'Think about what happens to the gas inside the dough.',
          clozeAnswers: ['bubbles', 'grow larger'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What makes the dough grow larger?',
        options: ['Bubbles of gas made by the yeast', 'Water soaking into the flour', 'Steam from the oven'],
        answerIndex: 0,
        explanationSpan: 'The gas forms thousands of small bubbles, and these bubbles make the dough grow larger.',
      },
    },
    {
      id: 's2',
      text: 'Kneading matters too. Stretching and folding the dough builds strands of gluten, a stretchy protein found in wheat flour. Gluten forms a kind of net that traps the gas bubbles, so the dough can rise instead of letting the gas escape. Bread made without enough kneading is often flat and heavy.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Kneading builds gluten, which forms a net that traps the gas so the dough can rise.',
          sourceSpans: [
            'Stretching and folding the dough builds strands of gluten',
            'Gluten forms a kind of net that traps the gas bubbles',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why kneading helps',
          semanticCue: 'Think of the stretchy protein in wheat flour and what it does with the bubbles.',
          clozeAnswers: ['gluten'],
        },
        {
          id: 's2-i2',
          text: 'Bread that has not been kneaded enough is often flat and heavy.',
          sourceSpans: ['Bread made without enough kneading is often flat and heavy.'],
          qualifiers: ['often'],
          relation: 'cause_effect',
          topic: 'what happens with too little kneading',
          semanticCue: 'Think about how the finished loaf turns out.',
          clozeAnswers: ['flat and heavy'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What does gluten do in bread dough?',
        options: ['It feeds the yeast', 'It traps the gas bubbles', 'It makes the crust brown'],
        answerIndex: 1,
        explanationSpan: 'Gluten forms a kind of net that traps the gas bubbles',
      },
    },
    {
      id: 's3',
      text: 'In the oven, the heat makes the trapped gas expand, so the loaf rises a little more in its first few minutes. The heat then kills the yeast, and the alcohol it made during rising evaporates. As the inside sets firm, the bubbles become the small holes you see when you cut a slice.',
      ideas: [
        {
          id: 's3-i1',
          text: 'Oven heat makes the gas expand so the loaf rises a bit more, then the heat kills the yeast.',
          sourceSpans: [
            'the heat makes the trapped gas expand, so the loaf rises a little more in its first few minutes',
            'The heat then kills the yeast',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'what happens in the oven',
          semanticCue: 'Think about the gas in the heat, and what happens to the yeast after that.',
          clozeAnswers: ['expand', 'rises a little more'],
        },
        {
          id: 's3-i2',
          text: 'The bubbles become the small holes you see in a slice of bread.',
          sourceSpans: ['the bubbles become the small holes you see when you cut a slice'],
          qualifiers: [],
          relation: 'fact',
          topic: 'what you see when you cut the bread',
          semanticCue: 'Look at a slice of bread in your mind. What are those little gaps?',
          clozeAnswers: ['small holes'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'What happens to the yeast in the oven?',
        options: ['It keeps growing until the bread cools', 'It turns into gluten', 'The heat kills it'],
        answerIndex: 2,
        explanationSpan: 'The heat then kills the yeast',
      },
    },
  ],
};

export default passage;
