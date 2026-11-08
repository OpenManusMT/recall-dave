import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p17-how-a-fridge-works',
  title: 'How a fridge keeps food cold',
  subject: 'science',
  summary: 'How a fridge moves heat out of the cabinet, and the temperature it should run at.',
  density: 'dense',
  kind: 'library',
  factNotes:
    'Vapour-compression refrigeration: refrigerant evaporates in the evaporator inside the cabinet, absorbing heat; the compressor raises its pressure and temperature; it condenses in the condenser pipes on the outside (usually the back, sometimes the sides), releasing heat to the room; it then returns through an expansion device. The Food Standards Agency advises keeping a fridge at 5°C or below. Dial numbers on many fridges are settings rather than degrees. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'A fridge does not make cold. Instead, it moves heat from inside the cabinet to the room outside. It does this with a special fluid called a refrigerant, which flows round and round a sealed loop of pipes. The trick depends on a simple fact: when a liquid evaporates and turns into a gas, it takes in heat from its surroundings. That is why wet skin feels cool in a breeze.',
      ideas: [
        {
          id: 's1-i1',
          text: 'A fridge does not create cold; it moves heat from inside the cabinet out into the room.',
          sourceSpans: [
            'it moves heat from inside the cabinet to the room outside',
            'A fridge does not make cold',
          ],
          qualifiers: ['not'],
          relation: 'fact',
          topic: 'what a fridge really does',
          semanticCue: 'Think about something being carried out, rather than something being made.',
          clozeAnswers: ['moves heat'],
        },
        {
          id: 's1-i2',
          text: 'It uses a refrigerant in sealed pipes, and relies on the fact that an evaporating liquid takes in heat.',
          sourceSpans: [
            'a special fluid called a refrigerant, which flows round and round a sealed loop of pipes',
            'when a liquid evaporates and turns into a gas, it takes in heat from its surroundings',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'the fluid in the pipes',
          semanticCue: 'Think about why wet skin feels cool when a breeze blows.',
          clozeAnswers: ['refrigerant'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'What does a fridge actually do to keep food cold?',
        options: [
          'It makes cold air and blows it in',
          'It moves heat from inside to the room outside',
          'It freezes the water in the food',
        ],
        answerIndex: 1,
        explanationSpan: 'Instead, it moves heat from inside the cabinet to the room outside.',
      },
    },
    {
      id: 's2',
      text: 'Inside the fridge, the refrigerant flows through pipes in the cabinet, often hidden behind the back wall. Here it evaporates, taking in heat from the air and food nearby, so the inside cools down. The gas then flows to a pump called a compressor, which usually sits at the bottom of the fridge and makes a low humming sound. The compressor squeezes the gas, which makes it hot.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Inside the cabinet, the refrigerant evaporates and takes in heat, so the inside cools down.',
          sourceSpans: [
            'Here it evaporates, taking in heat from the air and food nearby, so the inside cools down',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what happens inside the cabinet',
          semanticCue: 'Think about the liquid changing into a gas, and what it takes with it.',
          clozeAnswers: ['evaporates', 'cools down'],
        },
        {
          id: 's2-i2',
          text: 'A pump called a compressor then squeezes the gas, which makes it hot.',
          sourceSpans: [
            'The gas then flows to a pump called a compressor',
            'The compressor squeezes the gas, which makes it hot',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'the next stage',
          semanticCue: 'Think about the part that hums, and what squeezing does to a gas.',
          clozeAnswers: ['compressor'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'Why does the inside of the fridge cool down?',
        options: [
          'Cold water is pumped in from outside',
          'The light switches off when the door closes',
          'The refrigerant evaporates and takes in heat',
        ],
        answerIndex: 2,
        explanationSpan:
          'Here it evaporates, taking in heat from the air and food nearby, so the inside cools down.',
      },
    },
    {
      id: 's3',
      text: 'The hot gas is then pushed through pipes on the outside of the fridge, usually at the back. There it cools, condenses back into a liquid and gives off the heat it collected inside. This is why the outside of a fridge can feel warm, and why it needs space for air to carry the heat away. The liquid then flows back inside, and the cycle starts again.',
      ideas: [
        {
          id: 's3-i1',
          text: 'In the outside pipes, the gas condenses back to a liquid and gives off the heat from inside.',
          sourceSpans: [
            'There it cools, condenses back into a liquid and gives off the heat it collected inside',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'where the heat goes',
          semanticCue: 'Think about the opposite of evaporating, and what it lets go of.',
          clozeAnswers: ['condenses', 'gives off the heat'],
        },
        {
          id: 's3-i2',
          text: 'That is why the outside of a fridge can feel warm, and why it needs space for air to carry heat away.',
          sourceSpans: [
            'This is why the outside of a fridge can feel warm, and why it needs space for air to carry the heat away',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why the outside feels warm',
          semanticCue: 'Think about pushing a fridge tight up against a wall.',
          clozeAnswers: ['feel warm', 'space'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why should a fridge not be pushed tight against a wall?',
        options: [
          'Air needs to carry away the heat it gives off',
          'The door would not open properly',
          'It would make the food too cold',
        ],
        answerIndex: 0,
        explanationSpan: 'why it needs space for air to carry the heat away',
      },
    },
    {
      id: 's4',
      text: 'Cold slows down the growth of bacteria that make food spoil, so the temperature inside matters. The Food Standards Agency advises keeping a fridge at 5°C or below. The numbers on the dial inside are usually just settings, not a temperature in degrees, so a simple fridge thermometer is a useful way to check.',
      ideas: [
        {
          id: 's4-i1',
          text: 'Cold slows the bacteria that spoil food, and the Food Standards Agency advises keeping a fridge at 5°C or below.',
          sourceSpans: [
            'The Food Standards Agency advises keeping a fridge at 5°C or below',
            'Cold slows down the growth of bacteria that make food spoil',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'the right temperature',
          semanticCue: 'Think of a single-figure number of degrees.',
          clozeAnswers: ['5°C or below'],
        },
        {
          id: 's4-i2',
          text: 'Dial numbers are usually settings, not degrees, so a fridge thermometer is a good way to check.',
          sourceSpans: [
            'The numbers on the dial inside are usually just settings, not a temperature in degrees, so a simple fridge thermometer is a useful way to check',
          ],
          qualifiers: ['usually', 'not'],
          relation: 'cause_effect',
          topic: 'checking the temperature',
          semanticCue: 'Think about what the numbers on the dial really mean.',
          clozeAnswers: ['settings', 'fridge thermometer'],
        },
      ],
      question: {
        id: 's4-q1',
        prompt: 'Why is a fridge thermometer useful?',
        options: [
          'The dial numbers are usually settings, not degrees',
          'It makes the fridge colder',
          'It shows when food is past its date',
        ],
        answerIndex: 0,
        explanationSpan:
          'The numbers on the dial inside are usually just settings, not a temperature in degrees, so a simple fridge thermometer is a useful way to check.',
      },
    },
  ],
};

export default passage;
