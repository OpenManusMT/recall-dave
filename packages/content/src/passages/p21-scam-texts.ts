import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p21-scam-texts',
  title: 'Spotting a scam text',
  subject: 'practical',
  summary: 'Warning signs in an unexpected text message, and what to do with one.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'UK Finance, bank and National Cyber Security Centre guidance: banks will never ask you to send your full PIN or password by text; do not click links in unexpected messages; contact the organisation using a number you trust, such as the one on the back of a bank card; in the UK, scam texts can be forwarded free to 7726 (which spells SPAM on a keypad) so the mobile network can investigate and block senders; spoofed messages can appear in the same thread as genuine ones. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'Scam text messages are designed to make you act quickly before you have time to think. They often pretend to come from a bank, a delivery company or a government office, and they may even appear in the same thread as genuine messages. Common warning signs include a message you were not expecting, a sense of urgency, such as a warning that your account will be closed, and a link to click.',
      ideas: [
        {
          id: 's1-i1',
          text: 'Scam texts often pretend to come from a bank or delivery firm, and may appear among genuine messages.',
          sourceSpans: [
            'They often pretend to come from a bank, a delivery company or a government office, and they may even appear in the same thread as genuine messages',
          ],
          qualifiers: ['often', 'may'],
          relation: 'fact',
          topic: 'who scam texts pretend to be',
          semanticCue: 'Think of organisations you would normally trust to send you a text.',
          clozeAnswers: ['bank', 'delivery company'],
        },
        {
          id: 's1-i2',
          text: 'Warning signs include a message you were not expecting, pressure to act quickly, and a link to click.',
          sourceSpans: [
            'a message you were not expecting, a sense of urgency, such as a warning that your account will be closed, and a link to click',
            'designed to make you act quickly before you have time to think',
          ],
          qualifiers: ['not'],
          relation: 'fact',
          topic: 'the warning signs',
          semanticCue: 'Think about surprise, pressure, and something to tap.',
          clozeAnswers: ['sense of urgency', 'link'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Why do scam texts often warn that your account will be closed?',
        options: [
          'To make you act quickly before you have time to think',
          'Because banks usually close accounts by text',
          'To remind you to pay a bill on time',
        ],
        answerIndex: 0,
        explanationSpan:
          'Scam text messages are designed to make you act quickly before you have time to think.',
      },
    },
    {
      id: 's2',
      text: 'Your bank will never ask you to send your full PIN or your password by text message. If a message asks for these, it is a scam. It is also safest not to click on links in messages you were not expecting, even if they look genuine. If you are worried, contact the organisation directly, using a phone number you trust, such as the one on the back of your bank card.',
      ideas: [
        {
          id: 's2-i1',
          text: 'A bank will never ask you to text your full PIN or password, so a message asking for them is a scam.',
          sourceSpans: [
            'Your bank will never ask you to send your full PIN or your password by text message',
            'If a message asks for these, it is a scam',
          ],
          qualifiers: ['never'],
          relation: 'fact',
          topic: 'what a bank will not ask for',
          semanticCue: 'Think of the secret numbers and words that unlock your money.',
          clozeAnswers: ['full PIN', 'password'],
        },
        {
          id: 's2-i2',
          text: 'Do not click links in unexpected messages; contact the organisation using a number you trust.',
          sourceSpans: [
            'It is also safest not to click on links in messages you were not expecting',
            'contact the organisation directly, using a phone number you trust, such as the one on the back of your bank card',
          ],
          qualifiers: ['not'],
          relation: 'fact',
          topic: 'what to do instead of tapping a link',
          semanticCue: 'Think about where on your bank card you could find a number to call.',
          clozeAnswers: ['links'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'A text asks you to reply with your full PIN. What should you conclude?',
        options: [
          'It is probably a real request from your bank',
          'You should reply quickly if it says it is urgent',
          'It is a scam, because banks never ask for this by text',
        ],
        answerIndex: 2,
        explanationSpan: 'If a message asks for these, it is a scam.',
      },
    },
    {
      id: 's3',
      text: 'In the UK, you can report a scam text by forwarding it to 7726, and this is free. The number spells SPAM on a phone keypad, which makes it easier to remember. Your mobile network can then look into the sender and block similar messages. After forwarding it, it is fine to delete the message.',
      ideas: [
        {
          id: 's3-i1',
          text: 'In the UK, you can report a scam text for free by forwarding it to 7726.',
          sourceSpans: ['you can report a scam text by forwarding it to 7726, and this is free'],
          qualifiers: [],
          relation: 'fact',
          topic: 'how to report a scam text',
          semanticCue: 'Think of a four-digit number you could send the message on to.',
          clozeAnswers: ['7726'],
        },
        {
          id: 's3-i2',
          text: 'The number spells SPAM on a keypad, and reports help mobile networks block similar messages.',
          sourceSpans: [
            'The number spells SPAM on a phone keypad',
            'Your mobile network can then look into the sender and block similar messages',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'why reporting helps',
          semanticCue: 'Look at the letters on the keys for 7, 7, 2 and 6.',
          clozeAnswers: ['SPAM'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'What happens after you forward a scam text to 7726?',
        options: [
          'Your mobile network can look into the sender and block similar messages',
          'The scammer is sent your phone number',
          'You are charged for the message',
        ],
        answerIndex: 0,
        explanationSpan:
          'Your mobile network can then look into the sender and block similar messages.',
      },
    },
  ],
};

export default passage;
