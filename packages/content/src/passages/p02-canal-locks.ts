import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p02-canal-locks',
  title: 'How a canal lock works',
  subject: 'travel',
  summary:
    'How a lock lifts or lowers a boat between two water levels, using gates, paddles and gravity.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Standard description of a pound lock on British canals: a chamber with gates at each end; paddles (sluices) wound open with a windlass let water in or out; water moves by gravity from the higher level, with no pumps; each use passes a lockful of water downhill, which reservoirs and feeder streams replace. Avoided lock dimensions and gate materials, which vary. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Canals cannot simply run up a hillside, because water would flow away downhill. Instead, the canal is built in a series of level stretches, like the steps of a staircase. A lock is the place where a boat moves from one step to the next. It is a deep chamber with walls of brick or stone and heavy gates at each end.',
      ideas: [
        {
          id: 's1-i1',
          text: 'A canal is built as a series of level stretches, like steps, because water would flow away down a slope.',
          sourceSpans: [
            'the canal is built in a series of level stretches, like the steps of a staircase',
            'because water would flow away downhill',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how a canal climbs a hill',
          semanticCue: 'Think of how you climb up inside a house, one flat step at a time.',
          clozeAnswers: ['level stretches', 'staircase'],
        },
        {
          id: 's1-i2',
          text: 'A lock is a deep brick or stone chamber with gates at both ends, where a boat moves between levels.',
          sourceSpans: [
            'a deep chamber with walls of brick or stone and heavy gates at each end',
            'A lock is the place where a boat moves from one step to the next',
          ],
          qualifiers: [],
          relation: 'fact',
          topic: 'what a lock is',
          semanticCue: 'Think of a walled box of water, and what closes off each end.',
          clozeAnswers: ['chamber', 'gates'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why is a canal built as a series of level stretches?',
        options: [
          'So that boats can travel faster',
          'Because water would flow away down a slope',
          'To make the canal easier to dig',
        ],
        answerIndex: 1,
        explanationSpan:
          'Canals cannot simply run up a hillside, because water would flow away downhill.',
      },
    },
    {
      id: 's2',
      text: 'To take a boat uphill, the lock is first emptied so that its water is level with the lower canal. The boat goes in and the lower gates are closed behind it. Next, small sluices called paddles are wound open at the top end, using a handle called a windlass. Water from the higher canal pours into the chamber, and the boat slowly rises with it. When the levels match, the upper gates can be opened.',
      ideas: [
        {
          id: 's2-i1',
          text: 'Going up, the boat enters the emptied lock and the lower gates are shut behind it.',
          sourceSpans: [
            'the lock is first emptied so that its water is level with the lower canal',
            'The boat goes in and the lower gates are closed behind it',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'the first steps going uphill',
          semanticCue: 'Think about the water level in the lock when the boat arrives from below.',
          clozeAnswers: ['emptied', 'lower canal'],
        },
        {
          id: 's2-i2',
          text: 'Paddles at the top are opened, so water from the higher canal fills the lock and lifts the boat.',
          sourceSpans: [
            'small sluices called paddles are wound open at the top end',
            'Water from the higher canal pours into the chamber, and the boat slowly rises with it',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how the boat is lifted',
          semanticCue: 'Think about where the new water comes from.',
          clozeAnswers: ['paddles', 'top end'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What makes the boat rise inside the lock?',
        options: [
          'Water from the higher canal filling the chamber',
          'A crane lifting the boat',
          "The boat's engine pushing it upwards",
        ],
        answerIndex: 0,
        explanationSpan:
          'Water from the higher canal pours into the chamber, and the boat slowly rises with it.',
      },
    },
    {
      id: 's3',
      text: 'Going downhill works the other way round. The boat enters a full lock, the top gates are shut, and paddles at the bottom end let the water drain into the lower canal, so the boat sinks gently down. No pumps are needed, because the water simply flows downhill by gravity. However, every use sends a lockful of water down the canal, so reservoirs and streams feed in more water to keep the canal topped up.',
      ideas: [
        {
          id: 's3-i1',
          text: 'Going down, the boat enters a full lock and water is let out at the bottom, so the boat sinks.',
          sourceSpans: [
            'The boat enters a full lock',
            'paddles at the bottom end let the water drain into the lower canal, so the boat sinks gently down',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'going downhill',
          semanticCue: 'It is the reverse of going up. Where does the water go?',
          clozeAnswers: ['full lock'],
        },
        {
          id: 's3-i2',
          text: 'Locks need no pumps because water moves by gravity, but each use sends water downhill, so reservoirs top the canal up.',
          sourceSpans: [
            'No pumps are needed, because the water simply flows downhill by gravity',
            'every use sends a lockful of water down the canal, so reservoirs and streams feed in more water',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'what moves the water',
          semanticCue:
            'Think about the force that pulls water down a hill, and what that costs the canal.',
          clozeAnswers: ['pumps', 'gravity'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'Why does a canal need reservoirs?',
        options: [
          'To power the pumps in each lock',
          'To stop the canal from flooding',
          'To replace the water that flows down each time a lock is used',
        ],
        answerIndex: 2,
        explanationSpan:
          'every use sends a lockful of water down the canal, so reservoirs and streams feed in more water to keep the canal topped up',
      },
    },
  ],
};

export default passage;
