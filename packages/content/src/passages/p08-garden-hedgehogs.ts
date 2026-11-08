import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p08-garden-hedgehogs',
  title: 'Hedgehogs in the garden',
  subject: 'nature',
  summary: 'What hedgehogs eat, when they hibernate, and how a garden can help them.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'British Hedgehog Preservation Society and Hedgehog Street guidance: mostly nocturnal; diet mainly beetles, caterpillars, earthworms and other invertebrates; hibernate roughly November to March depending on the weather; never give milk; offer fresh water and meaty cat or dog food as a supplement; gaps about 13 cm by 13 cm in fences link gardens. Hedgehogs travel a long way in a night (often quoted as about a mile), left vague. Did not say why milk is harmful. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Hedgehogs are mostly active at night. During the day they usually sleep in a nest of leaves under a hedge, a shed or a pile of logs. After dark they come out to hunt for food by smell, snuffling through flower beds and lawns. Their main foods are beetles, earthworms and caterpillars, so a garden that is not too tidy can be a good place for them.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Hedgehogs are mostly nocturnal, and usually spend the day asleep in a nest of leaves.',
          sourceSpans: [
            'Hedgehogs are mostly active at night',
            'During the day they usually sleep in a nest of leaves',
          ],
          qualifiers: ['usually'],
          relation: 'fact',
          topic: 'when hedgehogs are active',
          semanticCue: 'Think about when you would be most likely to see one on the lawn.',
          clozeAnswers: ['at night'],
        },
        {
          id: 's1-i2',
          text: 'They mainly eat beetles, earthworms and caterpillars, so a garden that is not too tidy suits them.',
          sourceSpans: [
            'Their main foods are beetles, earthworms and caterpillars',
            'a garden that is not too tidy can be a good place for them',
          ],
          qualifiers: ['not'],
          relation: 'cause_effect',
          topic: 'what hedgehogs eat',
          semanticCue: 'Think of small creatures that live in the soil and among fallen leaves.',
          clozeAnswers: ['beetles', 'earthworms', 'caterpillars'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why might a garden that is not too tidy suit hedgehogs?',
        options: [
          'It gives them somewhere to find milk',
          'It keeps them awake through the winter',
          'It is a good place to find the small creatures they eat',
        ],
        answerIndex: 2,
        explanationSpan:
          'Their main foods are beetles, earthworms and caterpillars, so a garden that is not too tidy can be a good place for them.',
      },
    },
    {
      id: 's2',
      text: 'In late autumn, when food becomes scarce, hedgehogs hibernate. They build a thicker nest of leaves and grass and sleep through the cold months, roughly from November to March, though this depends on the weather. Their heart rate and breathing slow right down to save energy. A quiet corner with a pile of leaves or logs gives them a safe place to spend the winter.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Hedgehogs hibernate through the cold months, roughly from November to March, depending on the weather.',
          sourceSpans: [
            'sleep through the cold months, roughly from November to March, though this depends on the weather',
          ],
          qualifiers: ['roughly'],
          relation: 'fact',
          topic: 'the winter sleep',
          semanticCue: 'Think of the months between bonfire night and the first signs of spring.',
          clozeAnswers: ['November to March'],
        },
        {
          id: 's2-i2',
          text: 'A quiet corner with a pile of leaves or logs gives them a safe place to hibernate.',
          sourceSpans: [
            'A quiet corner with a pile of leaves or logs gives them a safe place to spend the winter',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how a garden can help in winter',
          semanticCue: 'Think about what they build their nests from.',
          clozeAnswers: ['pile of leaves or logs'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why do hedgehogs hibernate in late autumn?',
        options: [
          'Their food becomes scarce',
          'Their spines need to grow back',
          'They need to raise their young',
        ],
        answerIndex: 0,
        explanationSpan: 'In late autumn, when food becomes scarce, hedgehogs hibernate.',
      },
    },
    {
      id: 's3',
      text: 'Many people like to leave food out for hedgehogs, but they should never be given milk. A shallow dish of fresh water is much better for them to drink, especially in dry weather. If you want to feed them, meaty cat or dog food is a suitable choice, put out in the evening. Feeding should add to their natural diet, not replace it.',
      ideas: [
        {
          id: 's3-i1',
          text: 'Hedgehogs should never be given milk; a shallow dish of fresh water is better.',
          sourceSpans: [
            'they should never be given milk',
            'A shallow dish of fresh water is much better for them to drink',
          ],
          qualifiers: ['never'],
          relation: 'comparison',
          topic: 'what to give them to drink',
          semanticCue:
            'One drink people often think of is wrong for them. What is the simple alternative?',
          clozeAnswers: ['milk'],
        },
        {
          id: 's3-i2',
          text: 'If you want to feed them, meaty cat or dog food is suitable.',
          sourceSpans: ['meaty cat or dog food is a suitable choice'],
          qualifiers: [],
          relation: 'fact',
          topic: 'what food to offer',
          semanticCue: 'Think of food made for pets that you might already buy.',
          clozeAnswers: ['meaty', 'cat or dog food'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Which drink should you leave out for a hedgehog?',
        options: ['A saucer of milk', 'A shallow dish of fresh water', 'A bowl of sweet tea'],
        answerIndex: 1,
        explanationSpan: 'A shallow dish of fresh water is much better for them to drink',
      },
    },
    {
      id: 's4',
      text: 'Hedgehogs travel a long way at night, moving through many gardens to find enough food and to find a mate. Solid fences and walls can block their way. A simple fix is to make a gap at the bottom of a fence, about 13 centimetres wide and 13 centimetres high, which is big enough for a hedgehog to pass through. Agreeing this with neighbours links gardens together into a safe route.',
      ideas: [
        {
          id: 's4-i1',
          text: 'Hedgehogs roam through many gardens at night looking for food and a mate, and solid fences can stop them.',
          sourceSpans: [
            'Hedgehogs travel a long way at night, moving through many gardens to find enough food and to find a mate',
            'Solid fences and walls can block their way',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why hedgehogs need to roam',
          semanticCue:
            'Think about the two things a hedgehog is searching for on its night-time journeys.',
          clozeAnswers: ['many gardens', 'a mate'],
        },
        {
          id: 's4-i2',
          text: 'A gap of about 13 centimetres at the bottom of a fence lets hedgehogs pass between gardens.',
          sourceSpans: [
            'make a gap at the bottom of a fence, about 13 centimetres wide and 13 centimetres high',
            'big enough for a hedgehog to pass through',
          ],
          qualifiers: ['about'],
          relation: 'fact',
          topic: 'a simple change to a fence',
          semanticCue: 'Think about where in the fence the gap goes, and roughly how big it is.',
          clozeAnswers: ['13 centimetres'],
        },
      ],
      question: {
        id: 's4-q1',
        prompt: 'What is the purpose of a small gap at the bottom of a fence?',
        options: [
          'To let hedgehogs travel between gardens',
          'To let rainwater drain away',
          'To keep hedgehogs out of the garden',
        ],
        answerIndex: 0,
        explanationSpan: 'which is big enough for a hedgehog to pass through',
      },
    },
  ],
};

export default passage;
